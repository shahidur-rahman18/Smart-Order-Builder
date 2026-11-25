import type { Group, GroupId, Menu, MenuOption, OptionId } from '../types/menu'

export interface MenuIndex {
  groupById: Map<GroupId, Group>
  optionById: Map<OptionId, MenuOption>
  groupByOptionId: Map<OptionId, Group>
}

// Builds fast lookups. Throws if an id is used twice, because every
// later lookup ("which group is this option in?") must have one answer.
export function buildMenuIndex(menu: Menu): MenuIndex {
  const groupById = new Map<GroupId, Group>()
  const optionById = new Map<OptionId, MenuOption>()
  const groupByOptionId = new Map<OptionId, Group>()

  for (const group of menu.groups) {
    if (groupById.has(group.id)) {
      throw new Error(`Duplicate group id: ${group.id}`)
    }
    groupById.set(group.id, group)

    for (const option of group.options) {
      if (optionById.has(option.id)) {
        throw new Error(`Duplicate option id: ${option.id}`)
      }
      optionById.set(option.id, option)
      groupByOptionId.set(option.id, group)
    }
  }

  return { groupById, optionById, groupByOptionId }
}
