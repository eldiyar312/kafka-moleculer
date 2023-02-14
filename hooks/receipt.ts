import moment from 'moment'
import { Pool } from 'pg'
import { postgres } from '../config/services'
import { MainMode } from '../constant'

const ZOOMS: moment.unitOfTime.Base[] = ['month', 'week', 'day', 'hour', 'minute']

const tables = {
  ReceiptAggregateCategoryDay: 'receipt_aggregate_category_days',
  ReceiptAggregateCategoryHour: 'receipt_aggregate_category_hours',
  ReceiptAggregateCategoryMinute: 'receipt_aggregate_category_minutes',
  ReceiptAggregateCategoryMonth: 'receipt_aggregate_category_months',
  ReceiptAggregateCategoryWeek: 'receipt_aggregate_category_weeks',
  ReceiptAggregateDay: 'receipt_aggregate_days',
  ReceiptAggregateHour: 'receipt_aggregate_hours',
  ReceiptAggregateMinute: 'receipt_aggregate_minutes',
  ReceiptAggregateMonth: 'receipt_aggregate_months',
  ReceiptAggregateProduct: 'receipt_aggregate_products',
  ReceiptAggregateWeek: 'receipt_aggregate_weeks',
}

type TUpdateAggregates = {
  content: { type: number; positions: string | any[] }
  device_id: number
  processed_at_tz: moment.MomentInput
  account_id: number
  automat_id: number
}

type TUpdateZoomAggregates = {
  content: { type: number; checkClose: { payments: any[] }; positions: string | any[] }
  device_id: any
  processed_at_tz: moment.MomentInput
  account_id: number
  automat_id: number
  amount: number
}

export const updateProductsAggregates = async (receipt: TUpdateAggregates): Promise<void> => {
  if (receipt.content.type !== 1 && receipt.content.type !== 2) return
  if (!receipt.device_id) return null

  const pool = new Pool(postgres)

  for (let i = 0; i < receipt.content.positions.length; i++) {
    const position = receipt.content.positions[i]
    const begin = moment(receipt.processed_at_tz).startOf('day')
    const sumIn = receipt.content.type === 1 ? position.quantity * position.price : 0
    const count = receipt.content.type === 1 ? position.quantity : 0
    const sumOut = receipt.content.type !== 1 ? position.quantity * position.price : 0

    const text = `
      SELECT 
        CASE
          WHEN ast.main_mode = ${MainMode.Pulse} THEN pp.id
          ELSE p.id
        END as id, ast.main_mode 
      FROM devices d
        JOIN automats a ON a.id = d.automat_id
        JOIN automat_settings ast ON ast.automat_id = a.id
        LEFT JOIN automat_products ap ON ap.automat_id = a.id
        LEFT JOIN products p ON p.id = ap.product_id
        LEFT JOIN pulse_planograms pp ON pp.automat_id = a.id
      WHERE d.id = ${receipt.device_id} AND (p.name = '${position.text}' OR pp.product_name = '${position.text}')
      GROUP BY p.id, pp.id, ast.main_mode
      ORDER BY p.id DESC LIMIT 1
    `

    const { rows } = await pool.query(text)
    if (!rows.length) continue

    await pool.query(`
      INSERT INTO ${
        tables.ReceiptAggregateProduct
      }(begin, count, sum_in, sum_out, account_id, device_id, automat_id, product_id, pulse_planogram_id)
      VALUES (
        '${begin.toISOString()}',
        ${count},
        ${sumIn},
        ${sumOut},
        ${receipt.account_id},
        ${receipt.device_id},
        ${receipt.automat_id},
        ${rows[0].main_mode !== MainMode.Pulse ? rows[0].id : null},
        ${rows[0].main_mode === MainMode.Pulse ? rows[0].id : null}
      )
    `)
  }
  pool.end()
}

export const updateZoomAggregates = async (receipt: TUpdateZoomAggregates): Promise<void> => {
  if (receipt.content.type !== 1 && receipt.content.type !== 2) return null
  if (!receipt.device_id) return null

  const pool = new Pool(postgres)

  for (let i = 0; i < ZOOMS.length; i++) {
    const zoom = ZOOMS[i]
    const begin = moment(receipt.processed_at_tz).startOf(zoom === 'week' ? 'isoWeek' : zoom)
    const end = moment(receipt.processed_at_tz)
      .endOf(zoom === 'week' ? 'isoWeek' : zoom)
      .milliseconds(0)

    const types = receipt.content.checkClose.payments.reduce(
      (result: { [x: string]: number }, { type }: any) =>
        Object.assign(result, { [type]: result[type] ? result[type] + 1 : 1 }),
      {}
    )

    const receiptAggregate: { [key: string]: string } = {
      month: tables.ReceiptAggregateMonth,
      week: tables.ReceiptAggregateWeek,
      day: tables.ReceiptAggregateDay,
      hour: tables.ReceiptAggregateHour,
      minute: tables.ReceiptAggregateMinute,
    }

    if (receipt.content.type === 1) {
      await pool.query(`
        INSERT INTO ${
          receiptAggregate[zoom]
        }(account_id, device_id, automat_id, begin, "end", count, sum_in, types, positions)
        VALUES (
          ${receipt.account_id},
          ${receipt.device_id},
          ${receipt.automat_id},
          '${begin.toISOString()}',
          '${end.toISOString()}',
          ${1},
          ${receipt.amount},
          '${JSON.stringify(types)}',
          '${JSON.stringify({ [receipt.content.positions.length]: 1 })}'
        )
      `)
    } else {
      await pool.query(`
        INSERT INTO ${
          receiptAggregate[zoom]
        }(account_id, device_id, automat_id, begin, "end", sum_out)
        VALUES (
          ${receipt.account_id},
          ${receipt.device_id},
          ${receipt.automat_id},
          '${begin.toISOString()}',
          '${end.toISOString()}',
          ${1}
        )
      `)
    }
  }
  pool.end()
}

export const updateCategoriesAggregates = async (
  receipt: TUpdateAggregates
): Promise<void | null> => {
  if (receipt.content.type !== 1 && receipt.content.type !== 2) return null
  if (!receipt.device_id) return null

  const pool = new Pool(postgres)

  const {
    rows: [data],
  } = await pool.query(`
    SELECT ast.main_mode FROM devices d
      JOIN automats a ON a.id = d.automat_id
      JOIN automat_settings ast ON ast.automat_id = a.id
    WHERE d.id = ${receipt.device_id}
    GROUP BY ast.main_mode
  `)
  if (data.main_mode === MainMode.Pulse) return null

  for (let i = 0; i < ZOOMS.length; i++) {
    const zoom = ZOOMS[i]
    const begin = moment(receipt.processed_at_tz).startOf(zoom === 'week' ? 'isoWeek' : zoom)
    const end = moment(receipt.processed_at_tz)
      .endOf(zoom === 'week' ? 'isoWeek' : zoom)
      .milliseconds(0)
    for (let i = 0; i < receipt.content.positions.length; i++) {
      const position = receipt.content.positions[i]
      const sumIn = receipt.content.type === 1 ? position.quantity * position.price : 0
      const sumOut = receipt.content.type !== 1 ? position.quantity * position.price : 0
      const quantity = receipt.content.type === 1 ? position.quantity : 0

      const receiptAggregateCategory: { [key: string]: string } = {
        month: tables.ReceiptAggregateCategoryMonth,
        week: tables.ReceiptAggregateCategoryWeek,
        day: tables.ReceiptAggregateCategoryDay,
        hour: tables.ReceiptAggregateCategoryHour,
        minute: tables.ReceiptAggregateCategoryMinute,
      }

      const {
        rows: [data],
      } = await pool.query(`
        SELECT p.product_category_id FROM devices d
          JOIN automats a ON a.id = d.automat_id
          JOIN automat_products ap ON ap.automat_id = a.id
          JOIN products p ON p.id = ap.product_id
        WHERE d.id = ${receipt.device_id} AND p.name = '${position.text}'
        GROUP BY p.product_category_id
        ORDER BY p.product_category_id DESC LIMIT 1
      `)
      if (!data) continue

      await pool.query(`
        INSERT INTO ${
          receiptAggregateCategory[zoom]
        }(begin, "end", account_id, device_id, automat_id, category_id, count, quantity, sum_in, sum_out)
        VALUES (
          '${begin.toISOString()}',
          '${end.toISOString()}',
          ${receipt.account_id},
          ${receipt.device_id},
          ${receipt.automat_id},
          ${data.product_category_id},
          ${1},
          ${quantity},
          ${sumIn},
          ${sumOut}
        )
      `)
    }
  }
  pool.end()
}
