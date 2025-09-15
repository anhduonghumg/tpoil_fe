import axios from 'axios'
import { API_BASE, ENV } from '../../config/env'

export const http = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
})

// if (ENV.XSRF_COOKIE && ENV.XSRF_HEADER) {
//   http.defaults.xsrfCookieName = ENV.XSRF_COOKIE
//   http.defaults.xsrfHeaderName = ENV.XSRF_HEADER
// }
