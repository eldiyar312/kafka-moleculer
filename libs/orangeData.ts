const { OrangeData, Order } = require('node-orangedata')

import { Pool } from 'pg'
import { orangeData, postgres } from '../config/services'
import { TAX_SYSTEMS } from '../constant'
import { log } from '../constant/logs'
import { changeCaseObjKeys, snakeToCamel } from '../helpers/algorithms'
import { ToRegistrationReceipt } from '../types/receipt'
import logger from './logger'

export const sendReceipt = async (receipt: ToRegistrationReceipt): Promise<any> => {
  try {
    const deviceGroup = await getAccountDeviceGroup(receipt)
    const privateKey = await getAccountPrivateKey(receipt)
    const companyInn = await getAccountCompanyInn(receipt)

    const agent = new OrangeData({ ...orangeData, privateKey })

    const refunds = receipt.content.checkClose.payments.filter(
      (payment) => payment?.acquiringData?.type === 'refund'
    )
    if (refunds.length) {
      let subtraction = 0
      refunds.forEach((refund) => {
        if (refund?.acquiringData?.amount) subtraction += refund?.acquiringData?.amount
      })
      if (receipt.amount > subtraction) receipt.amount -= subtraction
    }

    delete receipt.deviceId
    const orangeDataValues = {
      ...changeCaseObjKeys(receipt, snakeToCamel),
      inn: companyInn,
      group: deviceGroup || 'Vend',
      key: '3019997',
      ...receipt.content,
      callbackUrl:
        (process.env.BACK_URL || 'http://localhost:3333') + '/api/fiscalization/' + receipt.id,
      taxationSystem: TAX_SYSTEMS.find(
        ({ value }) => value === Number(receipt.content.checkClose.taxationSystem)
      )?.orangeDataValue,
    }
    // logger.info(log.OD_VALUES, log.ORANGE_DATA({ data: orangeDataValues }))

    const order = new Order(orangeDataValues)
    receipt?.content?.positions?.forEach((position) => order.addPosition(position))
    receipt?.content?.checkClose?.payments?.forEach((payment) =>
      order.addPayment({
        ...payment,
        type: Number(payment.type) + 1,
      })
    )
    // if (receipt.content?.agentType) order.addAgent(receipt.content)
    // if (receipt.content?.additionalUserAttribute) {
    //   order.addUserAttribute(receipt.content.additionalUserAttribute)
    // }
    // logger.info(log.ORDER_VALUES, log.ORANGE_DATA({ data: order }))

    await agent.sendOrder(order)

    // logger.info(log.OD_FISCALIZATION_RESPONSE, log.ORANGE_DATA({ data: result }))
    // return checkOrder(order, agent)
  } catch (error) {
    updateReceiptFiscalizationError(receipt, `${error.message}\n ${JSON.stringify(error.errors)}`)
    logger.error(
      log.SEND_RECEIPT + error.message,
      log.ORANGE_DATA({
        error: {
          tag: 'app:http_requests:out',
          errors: error?.errors ? JSON.stringify(error.errors) : undefined,
        },
      })
    )
  }
}

// async function checkOrder(
//   order: any,
//   agent: { getOrderStatus: (arg0: any, arg1: any) => any },
//   retry = 1
// ): Promise<boolean | any> {
//   const { inn, id } = order

//   if (retry === 3) return false

//   const status = await agent.getOrderStatus(inn, id)
//   if (status) {
//     logger.info('Чек успешно пробит онлайн-кассой', log.ORANGE_DATA({ data: { id, status } }))
//     return status
//   }

//   logger.info('Следующая проверка статуса чека через 5 секунд', log.ORANGE_DATA({ data: { id } }))

//   return new Promise((resolve) => {
//     setTimeout(async () => resolve(await checkOrder(order, agent, retry + 1)), 5 * 1000)
//   }).then((d: boolean | any) => d)
// }

const getAccountDeviceGroup = async (receipt: ToRegistrationReceipt) => {
  const pool = new Pool(postgres)

  const { rows } = await pool.query(`
    SELECT ag.orange_data_group FROM devices d
      JOIN automats a ON a.id = d.automat_id
      JOIN automat_groups ag ON ag.id = a.group_id
    WHERE d.device_name = '${receipt.deviceId}'
    GROUP BY ag.orange_data_group
  `)

  if (!rows[0]?.orange_data_group) throw new Error(`not found orange_data_group`)

  pool.end()
  return rows[0].orange_data_group
}

const getAccountPrivateKey = async (receipt: ToRegistrationReceipt) => {
  const pool = new Pool(postgres)

  const { rows } = await pool.query(`
    SELECT i.private_key FROM devices d
      JOIN integrations i ON i.account_id = d.account_id
    WHERE d.device_name = '${receipt.deviceId}'
    GROUP BY i.private_key
  `)

  if (!rows[0]?.private_key) throw new Error(`not found private key`)

  pool.end()
  return rows[0].private_key
}

const getAccountCompanyInn = async (receipt: ToRegistrationReceipt) => {
  const pool = new Pool(postgres)

  const { rows } = await pool.query(`
    SELECT o.inn FROM devices d
      JOIN organizations o ON o.account_id = d.account_id
    WHERE d.device_name = '${receipt.deviceId}'
    GROUP BY o.inn
  `)

  if (!rows[0]?.inn) throw new Error(`not found comapny inn`)

  pool.end()
  return rows[0].inn
}

const updateReceiptFiscalizationError = async (
  receipt: ToRegistrationReceipt,
  errorText: string
) => {
  const pool = new Pool(postgres)

  await pool.query(`
    UPDATE receipts SET
    fiscalization_error = '${errorText}'
    WHERE id = '${receipt.id}'
  `)

  pool.end()
}
