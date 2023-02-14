import { TObject } from '../types/receipt'

/**
 *
 * @param {any[]} arr array of objects [{type:'one'}, {type:'one'}, {type:'two'}]
 * @param {string} key objects key in array 'type'
 * @returns {Array<any[]>} array arrays of objects [ [{type: 'one'},{type: 'one'}], [{type:'two'}] ]
 */
export const sortSeparation = (arr: any[], key: string): Array<any[]> => {
  let output: Array<any[]> = []

  if (arr.length < 2) return [arr]

  for (let i = 0; i < arr.length; i++) {
    output = [
      arr.filter((e) => e[key] === arr[i][key]),
      ...sortSeparation(
        arr.filter((e) => e[key] !== arr[i][key]),
        key
      ),
    ]
  }

  return output
}

/**
 * TO_CAMEL = toCamel
 * to_camel = toCamel
 * TO-CAMEL = toCamel
 * to-camel = toCamel
 * @param {string} str string
 * @returns
 */
export const snakeToCamel = (str: string) =>
  str
    .toLowerCase()
    .replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''))

/**
 * TO_CAMEL = ToCamel
 * to_camel = ToCamel
 * TO-CAMEL = ToCamel
 * to-camel = ToCamel
 * @param {string} str string
 * @returns
 */
export const snakeToUpperCamelCase = (str: string) =>
  snakeToCamel(str).charAt(0).toUpperCase() + str.slice(1)

/**
 *
 * @param object Array of objects or Object
 * @param caseFn function for change string case
 * @returns Array of objects or Object
 */
export const changeCaseObjKeys = (
  object: Array<{ [key: string]: any }> | { [key: string]: any },
  caseFn: (a: string) => string
): Array<{ [key: string]: any }> | { [key: string]: any } => {
  const result: { [key: string]: any } = {}

  if (Array.isArray(object)) return object.map((item) => changeCaseObjKeys(item, caseFn))

  if (typeof object !== 'object') return object
  for (const key in object) {
    const value = object[key]
    if (typeof value === 'object' && value !== null)
      result[caseFn(key)] = changeCaseObjKeys(value, caseFn)
    else result[caseFn(key)] = value
  }

  return result
}

/**
 *
 * @param {Array<{[key: string]: any}> | {[key: string]: any}} obj {key: 'value', data: [{name: 'Sam'}]}
 * @param {{[key: string]: string}} changes {key: 'key2', name: 'fullName'}
 * @returns {Array<{[key: string]: any}> | {[key: string]: any}} {key2: 'value', data: [{fullName: 'Sam'}]}
 */
export const renameObjKeys = (
  obj: TObject | Array<TObject>,
  changes: { [key: string]: string }
): TObject | Array<TObject> => {
  if (Array.isArray(obj)) return obj.map((item) => renameObjKeys(item, changes))
  if (typeof obj !== 'object') return obj

  for (const key in obj) {
    const newKey = changes[key]
    const value = obj[key]
    if (typeof value === 'object' && value !== null) obj[key] = renameObjKeys(value, changes)
    if (newKey) {
      obj[newKey] = value
      delete obj[key]
    }
  }

  return obj
}
