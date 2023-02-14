'use strict'
import { CronJob } from 'cron'
import { Service, ServiceBroker } from 'moleculer'

import { Pool } from 'pg'
import { FiscalizationStatus, TABLE, TOPIC } from '../constant'
import { log } from '../constant/logs'
import { renameObjKeys, sortSeparation } from '../helpers/algorithms'
import logger from '../libs/logger'
import { sendReceipt } from '../libs/orangeData'
import DbMixin from '../mixins/db.mixin'
import KafkaMixin from '../mixins/kafka.mixin'
import {
  TAutomatProduct,
  TAutomatSetting,
  TCommand,
  TData,
  ToRegistrationReceipt,
} from '../types/receipt'

export default class CronService extends Service {
  sendPlanogramJob: CronJob
  sendSetting: CronJob
  sendServiceMenu: CronJob
  sendPulsePlanogram: CronJob
  pool: Pool

  public constructor(public broker: ServiceBroker) {
    super(broker)
    this.parseServiceSchema({
      name: 'cron',
      mixins: [KafkaMixin, DbMixin],
      actions: {
        sendPlanogram: async () => {
          this.sendPlanogramJob = new CronJob('*/30 * * * * *', () =>
            this.sendToSystemQueue(TABLE.AUTOMAT_PRODUCTS)
          )
          this.sendPlanogramJob.start()
        },
        sendSetting: async () => {
          this.sendSettingJob = new CronJob('*/30 * * * * *', () =>
            this.sendToSystemQueue(TABLE.AUTOMAT_SETTINGS)
          )
          this.sendSettingJob.start()
        },
        sendServiceMenu: async () => {
          this.sendServiceMenuJob = new CronJob('*/10 * * * * *', () =>
            this.sendToSystemQueue(TABLE.SERVICE_MENU)
          )
          this.sendServiceMenuJob.start()
        },
        sendPulsePlanogram: async () => {
          this.sendPulsePlanogramJob = new CronJob('*/30 * * * * *', () =>
            this.sendToSystemQueue(TABLE.PULSE_PLANOGRAMS)
          )
          this.sendPulsePlanogramJob.start()
        },
        resendReceiptToFiscalization: async () => {
          this.resendReceiptToFiscalizationJob = new CronJob(
            '*/10 * * * * *',
            this.sendReceiptToFiscalization
          )
          this.resendReceiptToFiscalizationJob.start()
        },
      },
      methods: {
        sendToSystemQueue: async (table: TABLE) => {
          let data = []
          switch (table) {
            case TABLE.PULSE_PLANOGRAMS:
              data = await this.getPulsePlanogram()
              break
            case TABLE.SERVICE_MENU:
              data = await this.getCommands()
              break
            case TABLE.AUTOMAT_PRODUCTS:
              data = await this.getAutomatProducts()
              break
            case TABLE.AUTOMAT_SETTINGS:
              data = await this.getAutomatSettings()
              break
            default:
          }

          if (!data || (Array.isArray(data) ? !data.length : !Object.keys(data).length)) return null
          this.sendToDeliverySystem(table, data)
        },
        sendToDeliverySystem: async (
          table: TABLE,
          data: TPulsePlanogram | TCommand[] | TAutomatSetting[] | TAutomatProduct[]
        ) => {
          try {
            const array =
              table === TABLE.PULSE_PLANOGRAMS ? (data as TPulsePlanogram).goods : (data as TData[])

            const sortedData = sortSeparation(array, 'device_name')
            for (let i = 0; i < sortedData.length; i++) {
              const elements:
                | IModifiedPlanogram[]
                | TAutomatSetting[]
                | TCommand[]
                | TAutomatProduct[] = sortedData[i]

              if (!elements.length) continue

              let message: TPulsePlanogram | TAutomatSetting | TCommand[] | TAutomatProduct[] = null

              switch (table) {
                case TABLE.PULSE_PLANOGRAMS:
                  message = {
                    ...data,
                    goods: elements,
                  } as TPulsePlanogram
                  break
                case TABLE.AUTOMAT_SETTINGS:
                  message = elements[0] as TAutomatSetting
                  break
                case TABLE.SERVICE_MENU:
                  message = elements as TCommand[]
                  break
                case TABLE.AUTOMAT_PRODUCTS:
                  message = elements as TAutomatProduct[]
                  break
                default:
                  break
              }

              await this.producer.send({
                topic: TOPIC.DELIVERY_SYSTEM,
                messages: [
                  {
                    key: elements[0].device_name,
                    value: JSON.stringify(message),
                    headers: { table },
                  },
                ],
              })
            }
          } catch (error) {
            logger.error(log.DELIVERY_SYSTEM_PRODUCER, log.CRON({ error: error.message }))
          }
        },
        getAutomatSettings: async (): Promise<TAutomatSetting[] | []> => {
          try {
            const data = await this.pool.query(`
              SELECT
                ast.id, ast.check_report, ast.sales_statistic_source,
                ast.bus_inactive_timeout, ast.main_mode, ast.client_enable,
                ast.vmc_audit_port_enable, ast.vmc_audit_port, ast.vmc_audit_baud_rate,
                ast.vmc_audit_protocol, ast.scale_factor, ast.decimal_places_cash,
                ast.decimal_places_cashless, ast.acquiring_shift_close_time,
                ast.acquiring_shift_close_period, ast.currency_cashless, ast.timezone,
                ast.keypad_direction, ast.timeout_vending_in_process,
                ast.qr_code_mode, ast.update_acquiring_config_after_shift_close,
                ast.load_work_keys_after_shift_close, ast.timeout_cancel_button_while_vending,
                d.device_name, 'automat_settings' as table, asf.settlement_address->>'value' as settlement_address, asf.settlement_place,
                asf.automat_number, asf.operation_mode, asf.tax_reporting, asf.taxation_system,
                jsonb_build_object('weekday', ass.weeks, 'time_from', ass.time_from, 'time_to', ass.time_to, 'period', ass.period) as eva_dts_report_schedule,
                CASE ast.main_mode
                  WHEN 0 THEN to_json(asmme)
                  WHEN 1 THEN to_json(asmm)
                  WHEN 2 THEN to_json(asmem)
                  WHEN 3 THEN to_json(asmps)
                  WHEN 4 THEN to_json(asmpl)
                END as settings_mode
              FROM automat_settings ast
                JOIN devices d ON ast.automat_id = d.automat_id
                JOIN automat_setting_schedules ass ON ast.schedule_id = ass.id
                JOIN automat_setting_fiscalizations asf ON ast.fiscalization_id =  asf.id
                JOIN automat_setting_mode_poses asmps ON ast.mode_pose_id = asmps.id
                JOIN automat_setting_mode_pulses asmpl ON ast.mode_pulse_id = asmpl.id
                JOIN automat_setting_mode_mdbs asmm ON ast.mode_mdb_id = asmm.id
                JOIN automat_setting_mode_mdb_exes asmme ON ast.mode_mdb_exe_id = asmme.id
                JOIN automat_setting_mode_exe_masters asmem ON ast.mode_exe_master_id = asmem.id
              WHERE ast.delivered_cube <= 5 AND ast.deleted_at IS NULL
              GROUP BY 
                ast.id, d.device_name, asf.settlement_address, asf.settlement_place, asf.automat_number, asf.operation_mode, 
                asf.tax_reporting, asf.taxation_system, asmps, asmpl, asmm, asmme, asmem, ass.weeks, ass.time_from, ass.time_to, ass.period
              ORDER BY ast.id ASC LIMIT 100
            `)

            if (!data.rows.length) return []

            return data.rows.map(({ settings_mode, ...row }) => ({ ...settings_mode, ...row }))
          } catch (error) {
            logger.error(log.GET_AUTOMAT_SETTINGS, log.CRON({ error: error.message }))
            return []
          }
        },
        getAutomatProducts: async (): Promise<TAutomatProduct[] | []> => {
          try {
            const data = await this.pool.query(`
              SELECT
                ap.id, ap.automat_price as price, json_build_object('slot_id', ap.slot, 'max_value', ap.max_value) as slot_info, p.product_category_id as group_id,
                d.device_name, 'automat_products' as table, p.name, p.tax::INTEGER, p.subject::INTEGER, p.payment_method_type, ap.updated_at, coalesce(ap.deleted_at::varchar(255), '') as deleted_at,
                CASE p.unit
                  WHEN '1' THEN 'шт'
                  WHEN '2' THEN 'кг'
                  WHEN '3' THEN 'л'
                  WHEN '4' THEN 'м2'
                  WHEN '5' THEN 'м3'
                  WHEN '6' THEN 'дм3'
                  WHEN '7' THEN 'г'
                  WHEN '8' THEN 'мл'
                  WHEN '9' THEN 'п.м.'
                  WHEN '10' THEN 'мг'
                  WHEN '11' THEN 'т'
                  WHEN '12' THEN 'м'
                  ELSE ''
                END as unit
              FROM automat_products ap
                JOIN devices d ON ap.automat_id = d.automat_id
                JOIN products p ON ap.product_id = p.id
              WHERE ap.delivered_cube <= 5
                GROUP BY ap.id, d.device_name, p.name, p.tax, p.subject, p.unit, p.payment_method_type, group_id
              ORDER BY ap.id ASC LIMIT 100
            `)

            if (!data.rows.length) return []

            return data.rows
          } catch (error) {
            logger.error(log.GET_AUTOMAT_PRODUCTS, log.CRON({ error: error.message }))
            return []
          }
        },
        getPulsePlanogram: async (): Promise<TPulsePlanogram | null> => {
          try {
            const { rows }: { rows: IDBPlanogram[] } = await this.pool.query(`
              SELECT
                pp.button_index, pp.pulse_index_exit, pp.product_name, pp.count, pp.unit_price,
                d.device_name, 'pulse_planograms' as table, pu.name as unit, pu.choice_step,
                a.id as automat_id, pp.id, pp.tax
              FROM automats a
                JOIN pulse_planograms pp ON a.id = pp.automat_id
                JOIN devices d ON pp.automat_id = d.automat_id
                JOIN pulse_units pu ON pp.pulse_unit_id = pu.id
              WHERE a.pulse_planogram_delivered_cube <= 5 AND pp.deleted_at IS NULL
              GROUP BY pp.id, d.device_name, pu.name, pu.choice_step, a.id
              ORDER BY pp.id ASC LIMIT 100
            `)

            if (!rows.length) return null

            const units = rows
              .map((row) => ({ name: row.unit, choice_step: row.choice_step }))
              .filter((unit, i, arr) => i === arr.findIndex((unit2) => unit.name === unit2.name))

            const planogram: IModifiedPlanogram[] = rows.map(
              ({ automat_id, unit, choice_step, ...row }) => {
                return {
                  unit_index: units.findIndex(({ name }) => unit === name),
                  ...row,
                }
              }
            )

            return { goods: planogram, units }
          } catch (error) {
            logger.error(log.GET_PULSE_PLANOGRAM, log.CRON({ error: error.message }))
            return null
          }
        },
        getReceipts: async (): Promise<ToRegistrationReceipt[] | null> => {
          try {
            const { rows } = await this.pool.query(`
              SELECT 
                r.id, content, amount, d.device_name as device_id, 
                processed_at, is_non_fiscal, fiscalization_status, operation_mode 
              FROM receipts r
                JOIN devices d ON r.device_id = d.id
              WHERE fiscalization_status = ${FiscalizationStatus.RESEND_TO_FISCALIZATION}
              GROUP BY r.id, d.device_name
              ORDER BY r.id ASC LIMIT 100
            `)

            if (!rows.length) return null

            const keys = {
              device_id: 'deviceId',
              processed_at: 'processedAt',
              is_non_fiscal: 'isNonFiscal',
              fiscalization_status: 'fiscalizationStatus',
              operation_mode: 'operationMode',
            }

            return renameObjKeys(rows, keys) as ToRegistrationReceipt[]
          } catch (error) {
            logger.error(log.GET_RECEIPTS, log.CRON({ error: error.message }))
            return null
          }
        },
        getCommands: async () => {
          try {
            const { rows } = await this.pool.query(`
              SELECT 
                sml.id, sml.status, d.device_name,
                'service_menu_logins' as table
              FROM devices d
                JOIN service_menu_logins sml ON sml.device_id = d.id
              WHERE status IS NOT NULL AND sml.delivered_cube <= 5
              GROUP BY sml.id, device_name
              ORDER BY id DESC LIMIT 100
            `)

            if (!rows.length) return []
            return rows as TCommand[]
          } catch (error) {
            logger.error(log.GET_COMMANDS, log.CRON({ error: error.message }))
            return []
          }
        },
        sendReceiptToFiscalization: async () => {
          try {
            const receipts: ToRegistrationReceipt[] | null = await this.getReceipts()

            if (!receipts) return null

            for (const receipt of receipts) sendReceipt(receipt)
          } catch (error) {
            logger.error(log.RESEND_TO_FISCALIZATION, log.CRON({ error: error.message }))
            return null
          }
        },
      },

      async started() {
        this.actions.sendPlanogram()
        this.actions.sendSetting()
        this.actions.sendServiceMenu()
        this.actions.sendPulsePlanogram()
        this.actions.resendReceiptToFiscalization()
      },
      async stopped() {
        this.sendPlanogramJob.stop()
        this.sendSetting.stop()
        this.sendServiceMenu.stop()
        this.sendPulsePlanogram.stop()
      },
    })
  }
}

interface IDBPlanogram {
  id: number
  button_index: number
  pulse_index_exit: number
  product_name: string
  count: number
  unit_price: number
  device_name: string
  table: string
  unit: string
  choice_step: number
  automat_id: number
  tax: number
}

interface IModifiedPlanogram extends Omit<IDBPlanogram, 'unit' | 'automat_id' | 'choice_step'> {
  unit_index: number
}

type TPulsePlanogram = {
  units: Array<{
    name: string
    choice_step: number
  }>
  goods: Array<IModifiedPlanogram>
}
