type TReceiptAcquiring = {
  AID: string
  APN: string
  IIN: string
  RRN: string
  TSI: string
  TVR: string
  acquirerAgentName: string | null
  acquirerBankName: string
  amount: number
  approvalCode: string
  cardholder: string | null | number | boolean
  cashlessType: string
  date: string
  errorCode: string
  errorMessage: string | null
  expirationDate: string
  id: string
  maskPan: string
  signNeeded: boolean
  slipNumber: string
  terminalId: string
  transactionId: string
  transactionResult: string
  type: string
}

type TReceiptPayment = {
  acquiringData: TReceiptAcquiring
  amount: number
  index: number
  processedAt: string
  type: number
}

type TReceiptCheckClose = {
  payments: Array<TReceiptPayment>
  taxationSystem: number
}

type TReceiptPosition = {
  paymentMethodType: number
  paymentSubjectType: number
  price: number
  quantity: number
  slotInfo: {
    slotId: number
  }
  tax: number
  text: string
}

type TReceiptContent = {
  automatNumber?: string
  checkClose: TReceiptCheckClose
  positions: Array<TReceiptPosition>
  settlementAddress: string
  settlementPlace: string
  type: number
}

export type TDBReceipt = {
  id: string
  type: number
  content: TReceiptContent
  amount: number
  calculation_address: string
  calculation_place: string
  operation_number: bigint
  fs_number: string
  device_sn: string
  device_rn: string
  ofd_name: string
  ofd_website: string
  ofd_inn: string
  fns_website: string
  document_index: string
  processed_at: string
  processed_at_tz: string
  change: number
  fp: string
  company_inn: string
  company_name: string
  document_number: number
  return_check_id: number
  operation_mode: number
  fiscalization_status: number
  fiscalization_error: string
  is_non_fiscal: boolean
  callback_url: string
  delivered_cube: number
  account_id: number
  automat_id: number
  device_id: number
}

export type ToRegistrationReceipt = {
  id: string
  content: TReceiptContent
  deviceId: string
  processedAt: string
  isNonFiscal: boolean
  fiscalizationStatus: number
  operationMode: number
  amount: number
}

export interface IFiscalizedReceipt {
  id: string
  change: number
  companyINN: string
  companyName: string
  deviceRN: string
  deviceSN: string
  documentIndex: number
  documentNumber: number
  fnsWebsite: string
  fp: string
  fsNumber: string
  ofdName: string
  ofdWebsite: string
  ofdinn: string
  processedAt: string
  shiftNumber: number
  callbackUrl: string
  sequentialId: number
  meta: any
  content: any
}

export interface IFiscalizedReceiptSendToDelivery extends IFiscalizedReceipt {
  deviceName: string
  fiscalizationStatus: number
  amount: number
}

export type TData = {
  id: number
  device_name: string
  [key: string]: any
}

export type TAutomatSetting = {
  id: number
  device_name: string
  table: string
  name: string
  check_report: boolean
  sales_statistic_source: number
  bus_inactive_timeout: number
  main_mode: number
  client_enable: number
  vmc_audit_port_enable: boolean
  vmc_audit_port: number
  vmc_audit_baud_rate: number
  vmc_audit_protocol: number
  scale_factor: 255
  decimal_places_cash: 4
  decimal_places_cashless: 4
  acquiring_shift_close_time: string
  acquiring_shift_close_period: number
  currency_cashless: number
  timezone: 14
  keypad_direction: number
  timeout_vending_in_process: number
  timeout_cancel_button_while_vending: number
  qr_code_mode: number
  update_acquiring_config_after_shift_close: boolean
  load_work_keys_after_shift_close: boolean
  eva_dts_report_schedule: {
    id: number
    weekday: string[]
    timeFrom: string
    timeTo: string
    period: number
    created_at: string
    updated_at: string
    deleted_at: string
  }
  settlement_address?: string
  settlement_place?: string
  automat_number?: string
  operation_mode?: number
  tax_reporting?: number
  taxation_system?: number
  pos_mode?: number
  pos_port?: number
  output_a_pulse_cost?: number
  output_b_pulse_cost?: number
  output_c_pulse_cost?: number
  output_a_pulse_period_msec?: number
  output_b_pulse_period_msec?: number
  output_c_pulse_period_msec?: number
  output_a_pulse_duration_msec?: number
  output_b_pulse_duration_msec?: number
  output_c_pulse_duration_msec?: number
  output_a_pulse_active?: number
  output_b_pulse_active?: number
  output_c_pulse_active?: number
  input_a_pulse_cost?: number
  input_b_pulse_cost?: number
  input_a_pulse_min_duration_msec?: number
  input_b_pulse_min_duration_msec?: number
  input_a_pulse_max_duration_msec?: number
  input_b_pulse_max_duration_msec?: number
  input_a_pulse_active?: number
  input_b_pulse_active?: number
  inhibit_input_active?: number
  inhibit_input_duration_msec?: number
  inhibit_a_output_active?: number
  inhibit_b_output_active?: number
  inhibit_output_inverse?: boolean
  vend_service_page_text?: string
  paid_cash_button?: boolean
  choice_step_button?: boolean
  pulse_service_phone?: string
  fixed_amount_selection_screen_timeout_sec?: number
  custom_amount_selection_screen_timeout_sec?: number
  unit_selection_screen_timeout_sec?: number
  payment_confirmation_screen_timeout_sec?: number
  show_qr_code_screen_timeout_sec?: number
  final_screen_timeout_sec?: number
  shift_item_id?: number
  cc_audit_port_enable?: boolean
  cc_audit_port?: number
  cc_audit_baud_rate?: number
  cc_audit_protocol?: number
  session_funds?: number
  cashless_level?: number
  cashless_address?: number
  bill_validator_used?: boolean
  coin_changer_used?: boolean
  cashless1_used?: boolean
  cashless2_used?: boolean
  cash_credit_max?: number
  cash_credit_timeout?: number
  bill_type_accepted?: number[]
  multi_vend?: boolean
  payout_algorithm_of_changer?: boolean
  payout_without_purchase?: boolean
  low_change_threshold?: number
  inhibit_bill_validator_in_low_change?: boolean
  deny_cash_credit_exchange?: boolean
  autorefund?: boolean
  pilferor_mode?: boolean
  credit_limit?: number
  created_at: string
  updated_at: string
  deleted_at: string
}

export type TCommand = {
  id: number
  device_name: string
  status: number
  table: string
}

export type TAutomatProduct = {
  id: number
  price: number
  slot_info: {
    max_value: number
    slot_id: number
  }
  device_name: string
  table: string
  name: string
  group_id: number
  tax: number
  subject: number
  unit: string
  sku: string
  payment_method_type: number
  updated_at: string
  deleted_at: string
}

export type TObject = {
  [key: string]: any
}
