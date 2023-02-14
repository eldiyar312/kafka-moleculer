export enum TOPIC {
  MAIN = 'main-queue',
  RECEIPT = 'receipt-registration',
  ORANGEDATA = 'send-orangedata',
  FISCALIZATION = 'update-fiscalization',
  SYSTEM = 'main-system',
  STATUS = 'status-queue',
  COMMAND = 'command-queue',
  DELIVERY_STATUS = 'delivery-status',
  DELIVERY_CUBE = 'delivery-cube',
  DELIVERY_SYSTEM = 'delivery-system',
}

export const TAX_SYSTEMS = [
  { value: 1, label: 'ОСН', orangeDataValue: 0 },
  { value: 2, label: 'УСН доход', orangeDataValue: 1 },
  { value: 4, label: 'УСН доход минус расход', orangeDataValue: 2 },
  { value: 8, label: 'ЕНВД', orangeDataValue: 3 },
  { value: 16, label: 'ЕСХН', orangeDataValue: 4 },
  { value: 32, label: 'ПСН', orangeDataValue: 5 },
]

export enum FISCALIZATION_STATUS {
  NEW = 1,
  SEND_ORANGE_DATA = 2,
  FISCALIZATED = 3,
  NOT_FISCALIZATED = 4,
  SEND_CUBE = 5,
  RECEIVE_CUBE = 6,
}

export enum TABLE {
  AUTOMAT_PRODUCTS = 'automat_products',
  AUTOMAT_SETTINGS = 'automat_settings',
  RECEIPTS = 'receipts',
  SERVICE_MENU = 'service_menu_logins',
  PULSE_PLANOGRAMS = 'pulse_planograms',
  AUTOMATS = 'automats',
}

export const typeForNatsTopic = {
  [TABLE.AUTOMAT_PRODUCTS]: 'planogram',
  [TABLE.AUTOMAT_SETTINGS]: 'setting',
  [TABLE.PULSE_PLANOGRAMS]: 'pulsePlanogram',
  [TABLE.SERVICE_MENU]: 'command',
  [TABLE.RECEIPTS]: 'receipt',
}

export enum CUBE_STAUS {
  OPEN_MENU = 1, // Открыть меню
  CLOSE_MENU = 2, // Закрыть меню
  RELOAD_DEVICE = 3, // Перезагрузить устройство
  RELOAD_MODEM = 4, // Перезагрузить модем
  UNTETHER_CUBE = 5, // Отвязать Cube от автомата
  MENU_OPENED = 6, // Меню открыт
  MENU_CLOSED = 7, // Меню закрыт
  DEVICE_RELOADED = 8, // Устройство перезагружено
  MODEM_RELOADED = 9, // Модем перезагружен
  CUBE_UNTETHERED = 10, // Cube отвязан от автомата
  LOGS_UPLOAD = 11, // Загрузить лог на HTTP сервер
  UPDATE_LOGGING = 12, // Изменить настройки логгирования
  UPDATE_ACQUIRING_CONFIGURATION = 13, // Обновить эквайринговую конфигурацию jpay
  UPLOAD_KCV = 14, // Загрузить ключи KCV jpay
  LOAD_MASTER_KEYS = 15, // Загрузить мастер-ключи jpay
  RELOAD_WORK_KEYS = 16, // Перезагрузить рабочие ключи jpa
}

export enum MainMode {
  MDB_EXE = 0,
  MDB = 1,
  EXE_MASTER = 2,
  POSE = 3,
  Pulse = 4,
  CafeCo = 5,
}

export const redisKeys = {
  accountPrivateKey: (accountId: number) => `account:private:key:${accountId}`,
  deviceGroup: (deviceId: number) => `device:group:${deviceId}`,
}

export enum FiscalizationStatus {
  IN_PROCESS = 1,
  TO_FISCALIZATION = 2,
  COMPLETE = 3,
  ERROR = 4,
  RESEND_TO_FISCALIZATION = 5,
}
