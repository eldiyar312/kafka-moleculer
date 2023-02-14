import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { ClientConfig } from 'pg'

export const elasticsearch = {
  clientOpts: { node: 'http://something.ru:9200' },
  indexPrefix: `cube-core-app-develop`,
}

export const natsConnectOptions = {
  servers: process.env.NATS,
  user: 'something',
  pass: 'something',
}

export const postgres: ClientConfig = {
  user: 'something',
  host: 'something',
  database: 'something',
  password: 'something',
  port: 5432,
}

export const kafkaConfig = {
  clientId: 'cube-core',
  brokers: ['localhost:9092'],
}

export const orangeData = {
  cert: fs.readFileSync(path.join(__dirname, './keys/test/client.crt')),
  key: fs.readFileSync(path.join(__dirname, './keys/test/client.key')),
  passphrase: '1234',
  ca: fs.readFileSync(path.join(__dirname, './keys/test/cacert.pem')),
  apiUrl: 'https://something.ru:12001/api/v2',
}
