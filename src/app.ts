import fastify from 'fastify'
import cookies from '@fastify/cookie'

export const app = fastify()

app.register(cookies)
