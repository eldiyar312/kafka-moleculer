import { DateTime } from 'luxon'
import { Pool } from 'pg'
import { parentPort } from 'worker_threads'
import { postgres } from '../config/services'
import { log } from '../constant/logs'
import logger from '../libs/logger'
import { IFiscalizedReceipt } from '../types/receipt'

parentPort.on(
  'message',
  async ({ receipts, status }: { receipts: IFiscalizedReceipt[]; status: boolean }) => {
    const pool = new Pool(postgres)
    try {
      const values = receipts
        .map(
          (receipt) =>
            `('${receipt.id}', ${status}, '${DateTime.now()}'::timestamptz, 
            ${receipt.change}, '${receipt.companyINN}', '${receipt.companyName}', 
            '${receipt.deviceRN}', '${receipt.deviceSN}', ${receipt.documentIndex}, 
            ${receipt.documentNumber}, '${receipt.fnsWebsite}', '${receipt.fp}', 
            '${receipt.fsNumber}', '${receipt.ofdName}', '${receipt.ofdWebsite}', 
            '${receipt.ofdinn}', '${receipt.processedAt}'::timestamptz)`
        )
        .join(',')

      const { rows } = await pool.query(`
        UPDATE receipts as r SET 
          fiscalization_status = receipt.status, updated_at = receipt.time, 
          change = receipt.change, company_inn = receipt.company_inn, 
          company_name = receipt.company_name, device_rn = receipt.device_rn, 
          device_sn = receipt.device_sn, document_index = receipt.document_index, 
          document_number = receipt.document_number, fns_website = receipt.fns_website, 
          fp = receipt.fp, fs_number = receipt.fs_number, ofd_name = receipt.ofd_name, 
          ofd_website = receipt.ofd_website, ofd_inn = receipt.ofd_inn, processed_at = receipt.processed_at
        FROM (values ${values}) as receipt (
          id, status, time, change, company_inn, company_name, device_rn, device_sn, document_index, 
          document_number, fns_website, fp, fs_number, ofd_name, ofd_website, ofd_inn, processed_at
        )
        WHERE r.id = uuid(receipt.id) RETURNING *
      `)
    } catch (error) {
      logger.error(
        log.WORK_UPDATE_FISCALIZATION,
        log.UPDATE_FISCALIZATION({ error: error.message })
      )
    } finally {
      pool.end()
    }
  }
)
