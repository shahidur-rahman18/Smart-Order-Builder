// The bridge between Gemini and stats.ts (C2 in DECISIONS.md).
// Gemini only sees these declarations. When it asks for one, runTool() loads
// FRESH orders and menu from our mock server on every call, so a checkout made
// a second ago is already counted (TC-18) and changed data changes the answer (TC-19).
import { api } from '../api/client'
import type { Menu } from '../types/menu'
import type { StoredOrder } from '../types/order'
import { AssistantError } from './errors'
import {
  averageOrderValue,
  bestSellingOptions,
  countOrders,
  couponUsage,
  describeData,
  ordersOnDate,
  revenueByPaymentMethod,
  totalRevenue,
} from './stats'

export const TOOL_NAMES = [
  'countOrders',
  'totalRevenue',
  'bestSellingOptions',
  'revenueByPaymentMethod',
  'averageOrderValue',
  'couponUsage',
  'ordersOnDate',
  'describeData',
] as const
export type ToolName = (typeof TOOL_NAMES)[number]

// Gemini's function declaration format (an OpenAPI-style schema for the arguments).
export interface FunctionDeclaration {
  name: ToolName
  description: string
  parameters?: {
    type: 'object'
    properties: Record<string, { type: 'string' | 'integer'; description: string }>
    required?: string[]
  }
}

export const toolDeclarations: FunctionDeclaration[] = [
  { name: 'countOrders', description: 'Total number of orders.' },
  { name: 'totalRevenue', description: 'Total revenue: the sum of every order payable.' },
  {
    name: 'bestSellingOptions',
    description:
      'Best-selling menu options by units (line quantity × option quantity). Says if first place is a tie.',
    parameters: {
      type: 'object',
      properties: { limit: { type: 'integer', description: 'How many top options to return. Default 1.' } },
    },
  },
  { name: 'revenueByPaymentMethod', description: 'Revenue and order count for each payment method.' },
  { name: 'averageOrderValue', description: 'Average payable per order.' },
  {
    name: 'couponUsage',
    description:
      'How many orders entered a coupon code, how many really got the discount, and why the others did not.',
  },
  {
    name: 'ordersOnDate',
    description: 'Orders and revenue on one calendar date in the shop time zone.',
    parameters: {
      type: 'object',
      properties: { date: { type: 'string', description: 'The date as YYYY-MM-DD.' } },
      required: ['date'],
    },
  },
  {
    name: 'describeData',
    description:
      'What this assistant can answer and what the order data does NOT contain (for example customers). ' +
      'Use it when no other tool fits the question.',
  },
]

function isToolName(name: string): name is ToolName {
  return TOOL_NAMES.some((tool) => tool === name)
}

// Loads the latest data from the mock server (same as the Orders tab does).
async function loadFreshData(): Promise<{ orders: StoredOrder[]; menu: Menu }> {
  try {
    const [{ orders }, { menu }] = await Promise.all([api.getOrders(), api.getMenu()])
    return { orders, menu }
  } catch {
    throw new AssistantError('other', 'Could not load orders from the shop server.')
  }
}

// The model sends arguments as JSON; we never trust their type.
function limitArg(args: Record<string, unknown>): number {
  const { limit } = args
  return typeof limit === 'number' && Number.isInteger(limit) && limit > 0 ? limit : 1
}

function dateArg(args: Record<string, unknown>): string {
  return typeof args.date === 'string' ? args.date : ''
}

// Runs one tool and returns a small JSON result for Gemini. Raw orders never leave here.
export async function runTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  if (!isToolName(name)) return { error: `Unknown tool "${name}".` }
  if (name === 'describeData') return describeData()

  const { orders, menu } = await loadFreshData()
  switch (name) {
    case 'countOrders':
      return countOrders(orders)
    case 'totalRevenue':
      return totalRevenue(orders)
    case 'bestSellingOptions':
      return bestSellingOptions(orders, menu, limitArg(args))
    case 'revenueByPaymentMethod':
      return revenueByPaymentMethod(orders)
    case 'averageOrderValue':
      return averageOrderValue(orders)
    case 'couponUsage':
      return couponUsage(orders)
    case 'ordersOnDate':
      return ordersOnDate(orders, dateArg(args), menu.shop.timeZone)
  }
}
