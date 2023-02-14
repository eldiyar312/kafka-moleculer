'use strict'
import { Consumer, EachBatchPayload, KafkaMessage } from 'kafkajs'
import { Service, ServiceBroker } from 'moleculer'
import path from 'path'
import { Worker } from 'worker_threads'

import { TOPIC } from '../constant'
import { log } from '../constant/logs'
import logger from '../libs/logger'
import { sendReceipt } from '../libs/orangeData'
import KafkaMixin from '../mixins/kafka.mixin'
import { ToRegistrationReceipt } from '../types/receipt'

export default class ReceiptService extends Service {
  consumerCreate: Consumer
  consumerSend: Consumer
  workerReceiptRegistration: Worker

  public constructor(public broker: ServiceBroker) {
    super(broker)
    this.parseServiceSchema({
      name: 'receipt',
      mixins: [KafkaMixin],
      actions: {
        async createInDB() {
          try {
            this.consumerCreate = await this.consumer(TOPIC.RECEIPT)
            await this.consumerCreate.run({
              eachBatch: async ({ batch, resolveOffset, heartbeat }: EachBatchPayload) => {
                this.createInDBHandler(batch.messages)
                for (let message of batch.messages) {
                  resolveOffset(message.offset)
                  await heartbeat()
                }
              },
            })
          } catch (error) {
            logger.error(log.RECEIPT_CONSUMER_CREATE, log.RECEIPT({ error: error.message }))
          }
        },
        async sendToOrangeData() {
          try {
            this.consumerSend = await this.consumer(TOPIC.ORANGEDATA)
            await this.consumerSend.run({
              eachBatch: async ({ batch, resolveOffset, heartbeat }: EachBatchPayload) => {
                this.sendToOrangeDataHandler(batch.messages)
                for (let message of batch.messages) {
                  resolveOffset(message.offset)
                  await heartbeat()
                }
              },
            })
          } catch (error) {
            logger.error(
              log.RECEIPT_CONSUMER_SEND_ORANGEDATA,
              log.RECEIPT({ error: error.message })
            )
          }
        },
      },
      methods: {
        createInDBHandler: (messages: KafkaMessage[]) => {
          const receipts: ToRegistrationReceipt[] = messages.map((m) => ({
            deviceId: m.key.toString(),
            ...JSON.parse(m.value.toString()),
          }))
          this.workerReceiptRegistration.postMessage(receipts)
        },
        sendToOrangeDataHandler: (messages: KafkaMessage[]) => {
          const receipts: ToRegistrationReceipt[] = messages.map((m) => ({
            deviceId: m.key.toString(),
            ...JSON.parse(m.value.toString()),
          }))

          for (const receipt of receipts) sendReceipt(receipt)
        },

        receiptRegistration: () => {
          this.workerReceiptRegistration = new Worker(
            path.resolve(__dirname, '../workers/receiptRegistration.js')
          )
          this.workerReceiptRegistration.on('message', async () => {})
          this.workerReceiptRegistration.on('error', (error) => {
            logger.error(
              log.RECEIPT_WORK_RECEIPT_REGISTRATION,
              log.RECEIPT({ error: error.message })
            )
          })
          this.workerReceiptRegistration.on('exit', (exitCode) => {
            logger.error(log.RECEIPT_WORK_RECEIPT_REGISTRATION_EXIT + exitCode)
          })
        },
      },
      async started() {
        await this.actions.createInDB()
        await this.actions.sendToOrangeData()
        this.receiptRegistration()
      },
      async stopped() {
        await this.workerReceiptRegistration.terminate()
      },
    })
  }
}
