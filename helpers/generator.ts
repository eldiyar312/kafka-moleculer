import { DateTime } from 'luxon'
import { v4 as uuidv4 } from 'uuid'

const products = [
  'Энергетик Адреналин Раш 0,5 л.',
  'Кешью 35 гр.',
  'Печенье ЮБИЛЕЙНОЕ',
  'Сок апельсиновый свежевыжатый 200 мл.',
  'МэндМс 45 гр.',
  'Батончик шоколадный Марс 50 гр.',
  'Батончик шоколадный Твикс 55 гр.',
  'Капучино кофе зерновой',
  'Бонаква 0,5 л. ПЭТ',
]

const receipt = {
  'amount': 140,
  'content': {
    'automatNumber': '3',
    'checkClose': {
      'payments': [
        {
          'acquiringData': {
            'AID': 'A0000000041010',
            'APN': 'MC Credit/Debit',
            'IIN': 'MC Credit/Debit',
            'RRN': '135512919542',
            'TSI': '',
            'TVR': '0000008001',
            'acquirerAgentName': null as null,
            'acquirerBankName': 'МТС банк\r\nООО "ОРАНФРЕШ"',
            'amount': 140,
            'approvalCode': '323036373038',
            'cardholder': null as null,
            'cashlessType': 2,
            'date': '2021-12-21T12:25:12.000+03:00',
            'errorCode': '00',
            'errorMessage': null as null,
            'expirationDate': '240430',
            'id': 'a665c6ae-e26b-4c2f-ba39-63aa0efb3ad5',
            'maskPan': '************8894',
            'signNeeded': false,
            'slipNumber': '000546',
            'terminalId': '73001181',
            'transactionId': '73001181',
            'transactionResult': 'approved',
            'type': 'purchase',
          },
          'amount': 140,
          'index': 1,
          'processedAt': '2021-12-21T12:25:28.009',
          'type': 1,
        },
      ],
      'taxationSystem': 4,
    },
    'positions': [
      {
        'paymentMethodType': 4,
        'paymentSubjectType': 1,
        'price': 140,
        'quantity': 1,
        'slotInfo': {
          'slotId': 39,
        },
        'tax': 6,
        'text': 'Энергетик Адреналин Раш 0,5 л.',
      },
    ],
    'settlementAddress': 'г Москва, Огородный проезд, д 8 стр 1',
    'settlementPlace': 'Холл',
    'type': 1,
  },
}

export const receiptGenerator = () => {
  const amount = getRandomArbitrary(1, 200)
  return {
    content: {
      inn: '7707083893',
      checkClose: {
        payments: [
          {
            acquiringData: {
              AID: 'A0000000041010',
              APN: 'VISA Classic',
              IIN: 'VISA Classic',
              RRN: '135512919542',
              TSI: '',
              TVR: '0000008001',
              acquirerAgentName: null as any,
              acquirerBankName: 'МТС банк\r\nООО "ОРАНФРЕШ"',
              amount,
              approvalCode: '323036373038',
              cardholder: null as any,
              cashlessType: 2,
              date: '2021-12-21T12:25:12.000+03:00',
              errorCode: '00',
              errorMessage: null as any,
              expirationDate: '240430',
              id: uuidv4(),
              maskPan: '************8894',
              signNeeded: false,
              slipNumber: '000546',
              terminalId: '73001181',
              transactionId: '73001181',
              transactionResult: 'approved',
              type: 'purchase',
            },
            amount,
            type: 1,
          },
        ],
        taxationSystem: 4,
      },
      positions: [
        {
          paymentMethodType: 4,
          paymentSubjectType: 1,
          price: amount,
          quantity: 1,
          slotInfo: {
            slotId: 39,
          },
          tax: 6,
          text: products[getRandomArbitrary(0, 8)],
        },
      ],
      type: 1,
    },
  }
}

export const getRandomArbitrary = (min = 0, max = 100) => {
  return Math.round(Math.random() * (max - min) + min)
}
