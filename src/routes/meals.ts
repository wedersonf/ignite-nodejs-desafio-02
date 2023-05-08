import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { knex } from '../database'
import { checkUserIdExists } from '../middlewares/check-user-id-exists'

export async function mealsRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const userId = request.headers?.user_id

    console.log(userId)
    let meals

    if (userId) {
      meals = await knex('meals').where({ user_id: userId.toString() }).select()
    } else {
      meals = await knex('meals').select()
    }

    return {
      meals,
    }
  })

  app.get(
    '/:id',
    { preHandler: [checkUserIdExists] },
    async (request, reply) => {
      const userId = String(request.headers.user_id)

      const getMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = getMealParamsSchema.parse(request.params)

      const meal = await knex('meals')
        .where({
          id,
        })
        .first()

      if (meal?.user_id !== userId) {
        return reply.status(401).send({
          error: 'Unauthorized.',
        })
      }

      return {
        meal,
      }
    },
  )

  app.get('/metrics', { preHandler: [checkUserIdExists] }, async (request) => {
    const userId = String(request.headers.user_id)

    const totalMealsInsideDiet = await knex('meals')
      .where({
        user_id: userId,
        inside_diet: true,
      })
      .count('inside_diet', { as: 'inside_diet' })

    const totalMealsOutsideDiet = await knex('meals')
      .where({
        user_id: userId,
        inside_diet: false,
      })
      .count('inside_diet', { as: 'outside_diet' })

    const metrics = {
      totalMeals:
        Number(totalMealsInsideDiet[0].inside_diet) +
        Number(totalMealsOutsideDiet[0].outside_diet),
      inside_diet: totalMealsInsideDiet[0].inside_diet,
      outside_diet: totalMealsOutsideDiet[0].outside_diet,
    }

    return {
      metrics,
    }
  })

  app.put(
    '/:id',
    { preHandler: [checkUserIdExists] },
    async (request, reply) => {
      const userId = String(request.headers.user_id)

      const updateMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const updateMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        datetime: z.string(),
        insideDiet: z.boolean(),
      })

      const { id } = updateMealParamsSchema.parse(request.params)

      const { name, description, datetime, insideDiet } =
        updateMealBodySchema.parse(request.body)

      const meal = await knex('meals').where({ id }).first()

      if (meal?.user_id !== userId) {
        return reply.status(401).send({
          error: 'Unauthorized.',
        })
      }

      await knex('meals').where({ id }).update({
        name,
        description,
        datetime,
        inside_diet: insideDiet,
        user_id: userId,
      })

      return reply.status(200).send()
    },
  )

  app.delete(
    '/:id',
    { preHandler: [checkUserIdExists] },
    async (request, reply) => {
      const userId = String(request.headers.user_id)

      const updateMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = updateMealParamsSchema.parse(request.params)

      const meal = await knex('meals').where({ id }).first()

      if (meal?.user_id !== userId) {
        return reply.status(401).send({
          error: 'Unauthorized.',
        })
      }

      await knex('meals').where({ id }).delete()

      return reply.status(204).send()
    },
  )

  app.post('/', { preHandler: [checkUserIdExists] }, async (request, reply) => {
    const userId = String(request.headers.user_id)

    const createMealBodySchema = z.object({
      name: z.string(),
      description: z.string(),
      datetime: z.string(),
      insideDiet: z.boolean(),
    })

    const { name, description, datetime, insideDiet } =
      createMealBodySchema.parse(request.body)

    await knex('meals').insert({
      id: randomUUID(),
      name,
      description,
      datetime,
      inside_diet: insideDiet,
      user_id: userId,
    })

    return reply.status(201).send()
  })
}
