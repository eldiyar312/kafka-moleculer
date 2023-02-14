import { Consumer, EachMessagePayload, KafkaMessage } from 'kafkajs'
import { Service, ServiceBroker } from 'moleculer'

import { CUBE_STAUS, TABLE, TOPIC } from '../constant'
import { log } from '../constant/logs'
import logger from '../libs/logger'
import DbMixin from '../mixins/db.mixin'
import KafkaMixin from '../mixins/kafka.mixin'

type TCubeStatus = {
  status: CUBE_STAUS
}

export default class CommandService extends Service {
  consumer: Consumer

  public constructor(public broker: ServiceBroker) {
    super(broker)
    this.parseServiceSchema({
      name: 'command',
      mixins: [KafkaMixin, DbMixin],
      actions: {
        async listen() {
          try {
            this.consumer = await this.consumer(TOPIC.COMMAND)
            await this.consumer.run({
              eachMessage: async ({ message, partition }: EachMessagePayload) => {
                this.statusHandler(message)
              },
            })
          } catch (error) {
            logger.error(log.COMMAND_CONSUMER, log.COMMAND({ error: error.message }))
          }
        },
      },
      methods: {
        statusHandler: async (message: KafkaMessage) => {
          try {
            const data: TCubeStatus = JSON.parse(message.value.toString())

            const { rows } = await this.pool.query(
              `SELECT id FROM devices WHERE device_name = '${message.key.toString()}'`
            )
            if (!rows.length) throw new Error('not found device')

            await this.pool.query(
              `INSERT INTO ${TABLE.SERVICE_MENU}(status, device_id, delivered_cube) VALUES (${data.status}, ${rows[0].id}, 10)`
            )
          } catch (error) {
            logger.error(log.UPDATE_SERVICE_MENU_STATUS, log.COMMAND({ error: error.message }))
          }
        },
      },
      async started() {
        await this.actions.listen()
      },
      async stopped() {
        await this.consumer.disconnect()
      },
    })
  }
}
