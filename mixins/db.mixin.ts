'use strict'
import { Pool } from 'pg'
import { postgres } from '../config/services'

export default {
  pool: Pool,
  methods: {},
  async started() {
    this.pool = new Pool(postgres)
  },
  async stopped() {
    await this.pool.end()
  },
}
