'use strict'
import { Kafka, PartitionAssigner, PartitionAssigners, ProducerRecord } from 'kafkajs'
import { kafkaConfig } from '../config/services'
import { log } from '../constant/logs'
import logger from '../libs/logger'

const kafka = new Kafka(kafkaConfig)

const producer = kafka.producer()
const admin = kafka.admin()

export default {
  methods: {
    consumer: async (topic: string, group?: string) => {
      try {
        const consumer = kafka.consumer({ groupId: group || topic + '-group' })
        await consumer.connect()
        await consumer.subscribe({ topic, fromBeginning: true })
        return consumer
      } catch (error) {
        logger.error(log.KAFKA_CONSUMER, log.KAFKA({ error: error.message }))
      }
    },
  },
  async started() {
    await producer.connect()
    await admin.connect()
    this.admin = admin
    this.producer = producer
  },
  async stopped() {
    await producer.disconnect()
    await admin.disconnect()
  },
}
