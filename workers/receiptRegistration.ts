import { DateTime } from 'luxon'
import { Pool } from 'pg'
import { parentPort } from 'worker_threads'

import 'dotenv/config'
import { postgres } from '../config/services'
import { FISCALIZATION_STATUS, MainMode } from '../constant'
import { log } from '../constant/logs'
import {
  updateCategoriesAggregates,
  updateProductsAggregates,
  updateZoomAggregates,
} from '../hooks/receipt'
import logger from '../libs/logger'
import { ToRegistrationReceipt } from '../types/receipt'

parentPort.on('message', async (receipts: Array<ToRegistrationReceipt>) => {
  const pool = new Pool(postgres)

  try {
    let values = []
    let sales = []
    for (let i = 0; i < receipts.length; i++) {
      const receipt = receipts[i]

      const { rows: products } = await pool.query(`
        SELECT 
          p.id as product_id, p.recipe,
          ap.automat_id, ap.id as automat_product_id, ap.balance, 
          a.name as automat_name, a.account_id, ast.main_mode,
          ag.id as automat_group_id, ag.name as automat_group_name,
          o.inn as company_inn, o.name as company_name, 
          d.id as device_id, pp.id as pulse_planogram_id,
          CASE
            WHEN ast.main_mode = ${MainMode.Pulse} THEN pp.product_name
            ELSE p.name
          END as product_name
        FROM devices d
          JOIN automats a ON a.id = d.automat_id
          JOIN automat_settings ast ON ast.automat_id = a.id
          JOIN automat_products ap ON ap.automat_id = a.id
          LEFT JOIN automat_groups ag ON ag.id = a.group_id
          LEFT JOIN organizations o ON o.account_id = a.account_id
          LEFT JOIN products p ON p.id = ap.product_id
          LEFT JOIN pulse_planograms pp ON pp.automat_id = a.id
        WHERE 
          d.device_name = '${receipt.deviceId}' 
          AND (
            p.name = '${receipt.content.positions[0].text}' OR 
            pp.product_name = '${receipt.content.positions[0].text}'
          )
        GROUP BY 
          a.name, a.account_id, a.updated_at, ast.main_mode, p.id, p.recipe, p.name, ap.automat_id, ap.id, 
          ap.balance, ag.name, ag.id, d.id, o.inn, o.name, pp.id, pp.product_name
        ORDER BY a.updated_at DESC LIMIT 1
      `)
      if (!products.length) continue

      if (products[0].main_mode === MainMode.Pulse) {
        // code
      } else {
        if (products[0].recipe) {
          await pool.query(`
            UPDATE reserviors r 
            SET balance = 
              CASE 
                WHEN apw.weight > balance THEN 0
                ELSE balance - apw.weight
              END
            FROM composite_products_ingredients cpi
              JOIN automat_product_weights apw ON apw.ingredient_id = cpi.ingredient_id
            WHERE r.ingredient_id = cpi.ingredient_id
              AND cpi.product_id = ${products[0].product_id}
              AND r.automat_id = ${products[0].automat_id}
              AND apw.automat_product_id = ${products[0].automat_product_id}
          `)
        } else {
          await pool.query(`
            UPDATE automat_products
            SET balance = ${products[0].balance ? products[0].balance - 1 : 0}
            WHERE id = ${products[0].automat_product_id}
          `)
        }
      }

      sales.push(`(
        '${products[0]?.product_name}',
        '${products[0].automat_name}',
        '${products[0]?.automat_group_name}',
        ${receipt.content.positions[0].price},
        ${receipt.content.positions[0].quantity},
        ${products[0].main_mode !== MainMode.Pulse ? products[0].automat_product_id : null},
        ${products[0].main_mode === MainMode.Pulse ? products[0]?.pulse_planogram_id : null},
        ${products[0]?.automat_group_id},
        ${products[0].automat_id},
        ${products[0].account_id},
        '${DateTime.now()}'::timestamptz,
        '${DateTime.now()}'::timestamptz
      )`)

      values.push(`(
        '${receipt.id}',
        '${JSON.stringify(receipt.content)}',
        ${receipt.amount},
        ${FISCALIZATION_STATUS.NEW},
        ${products[0].account_id},
        ${products[0]?.automat_id},
        '${products[0].device_id}',
        '${(process.env.BACK_URL || 'http://localhost:3333') + '/api/fiscalization/' + receipt.id}',
        '${products[0]?.company_inn}',
        '${products[0]?.company_name}',
        '${receipt.processedAt}',
        '${receipt.processedAt}',
        '${DateTime.now()}'::timestamptz,
        '${DateTime.now()}'::timestamptz
      )`)
    }

    if (values.length && sales.length) {
      await pool.query(`
        INSERT INTO sales (
          product_name, automat_name, group_name, price, quantity, 
          automat_product_id, pulse_planogram_id, group_id, 
          automat_id, account_id, created_at, updated_at
        )
        VALUES ${sales.join(',')}
      `)

      const { rows } = await pool.query(`
        INSERT INTO receipts(
          id, content, amount, fiscalization_status, 
          account_id, automat_id, device_id, 
          callback_url, company_inn, company_name, 
          processed_at, processed_at_tz, created_at, updated_at
        )
        VALUES ${values.join(',')} RETURNING *
      `)

      for (const receipt of rows) {
        await updateProductsAggregates(receipt)
        await updateZoomAggregates(receipt)
        await updateCategoriesAggregates(receipt)
      }

      parentPort.postMessage(rows)
    }
  } catch (error) {
    logger.error(log.WORK_RECEIPT_REGISTRATION, log.RECEIPT_REGISTRATION({ error: error.message }))
  } finally {
    pool.end()
  }
})
