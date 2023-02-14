import { createLogger, transports, format } from 'winston'
import { ElasticsearchTransport } from 'winston-elasticsearch'
import { elasticsearch } from '../config/services'
import 'dotenv/config'

const logger = createLogger({
  transports: [
    process.env.NODE_ENV === 'development'
      ? new transports.Console({
          format: format.combine(format.colorize(), format.align(), format.simple()),
        })
      : new ElasticsearchTransport(elasticsearch),
  ],
})

export default logger
