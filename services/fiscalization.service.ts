'use strict'
import { Consumer, EachBatchPayload, KafkaMessage } from 'kafkajs'
import { Service, ServiceBroker } from 'moleculer'
import path from 'path'
import { Worker } from 'worker_threads'

import { FISCALIZATION_STATUS, TOPIC } from '../constant'
import { log } from '../constant/logs'
import logger from '../libs/logger'
import DbMixin from '../mixins/db.mixin'
import KafkaMixin from '../mixins/kafka.mixin'
import { IFiscalizedReceipt, IFiscalizedReceiptSendToDelivery } from '../types/receipt'

export default class FiscalizationService extends Service {
  consumer: Consumer
  workerUpdateFiscalization: Worker

  public constructor(public broker: ServiceBroker) {
    super(broker)
    this.parseServiceSchema({
      name: 'fiscalization',
      mixins: [KafkaMixin, DbMixin],
      actions: {
        post: {
          params: { id: 'string' },
          async handler(ctx) {
            try {
              await this.producer.send({
                topic: TOPIC.FISCALIZATION,
                messages: [{ value: JSON.stringify(ctx.params) }],
              })
            } catch (error) {
              logger.error(log.FISCALIZATION_PRODUCER, log.FISCALIZATION({ error: error.message }))
            }
          },
        },
        async listen() {
          try {
            this.consumer = await this.consumer(TOPIC.FISCALIZATION)
            await this.consumer.run({
              eachBatch: async ({ batch, resolveOffset, heartbeat }: EachBatchPayload) => {
                this.handler(batch.messages)
                for (let message of batch.messages) {
                  resolveOffset(message.offset)
                  await heartbeat()
                }
              },
            })
          } catch (error) {
            logger.error(log.FISCALIZATION_CONSUMER, log.FISCALIZATION({ error: error.message }))
          }
        },
      },
      methods: {
        handler: async (fiscalizatedReceipts: KafkaMessage[]) => {
          const receipts: IFiscalizedReceipt[] = fiscalizatedReceipts.map((receipt) =>
            JSON.parse(receipt.value.toString())
          )

          this.workerUpdateFiscalization.postMessage({
            receipts,
            status: FISCALIZATION_STATUS.FISCALIZATED,
          })

          const message: IFiscalizedReceiptSendToDelivery[] = []

          for (const receipt of receipts) {
            const deviceName = await this.getDeviceNameByReceiptId(receipt.id)
            const amount = await this.getReceiptAmountByReceiptId(receipt.id)
            message.push({ deviceName, fiscalizationStatus: 3, amount, ...receipt })
          }

          this.producer.send({
            topic: TOPIC.DELIVERY_CUBE,
            messages: [{ value: JSON.stringify(message) }],
          })
        },
        updateFiscalitions: () => {
          this.workerUpdateFiscalization = new Worker(
            path.resolve(__dirname, '../workers/updateFiscalization.js')
          )
          this.workerUpdateFiscalization.on('error', (error) => {
            logger.error(
              log.FISCALIZATION_WORK_UPDATE_FISCALIZATION,
              log.FISCALIZATION({ error: error.message })
            )
          })
          this.workerUpdateFiscalization.on('exit', (exitCode) => {})
        },
        getDeviceNameByReceiptId: async (receiptUuid: string | number): Promise<string> => {
          const { rows } = await this.pool.query(`
            SELECT d.device_name FROM receipts r
              JOIN automats a ON a.id = r.automat_id
              JOIN devices d ON d.automat_id = a.id
            WHERE r.id = ${typeof receiptUuid === 'number' ? receiptUuid : `'${receiptUuid}'`} 
            ORDER BY d.id ASC LIMIT 1
          `)
          if (!rows.length) return ''
          return rows[0].device_name
        },
        getReceiptAmountByReceiptId: async (receiptUuid: string | number): Promise<number> => {
          const { rows } = await this.pool.query(`
            SELECT amount FROM receipts r
            WHERE r.id = ${typeof receiptUuid === 'number' ? receiptUuid : `'${receiptUuid}'`}
          `)
          if (!rows.length) return 0
          return rows[0].amount
        },
      },
      async started() {
        this.updateFiscalitions()
        await this.actions.listen()
      },
      async stopped() {
        await this.workerUpdateFiscalization.terminate()
      },
    })
  }
}
