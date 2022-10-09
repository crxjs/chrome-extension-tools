import { ModuleNode } from 'vite'
import { isImporter } from './isImporter'
import { test, expect } from 'vitest'

function createModuleNode(name: string) {
  return {
    file: name,
    importers: new Set<ModuleNode>(),
    importedModules: new Set<ModuleNode>(),
  } as ModuleNode
}

test('exact match', () => {
  const background = createModuleNode('background.js')
  expect(isImporter('background.js')(background)).toBe(true)
})

test('parent match', () => {
  const parent1 = createModuleNode('parent1.js')
  const parent2 = createModuleNode('parent2.js')
  const child = createModuleNode('child.js')
  child.importers = new Set([parent1, parent2])
  parent1.importedModules.add(child)
  parent2.importedModules.add(child)

  expect(isImporter('parent1.js')(child)).toBe(true)
})

test('no child match', () => {
  const parent1 = createModuleNode('parent1.js')
  const parent2 = createModuleNode('parent2.js')
  const child = createModuleNode('child.js')
  child.importers = new Set([parent1, parent2])
  parent1.importedModules.add(child)
  parent2.importedModules.add(child)

  expect(isImporter('child.js')(parent1)).toBe(false)
})

test('no sibling match for parent', () => {
  const parent1 = createModuleNode('parent1.js')
  const parent2 = createModuleNode('parent2.js')
  const child1 = createModuleNode('child.js')
  const child2 = createModuleNode('child.js')
  child1.importers = new Set([parent1, parent2])
  child2.importers = new Set([parent1, parent2])
  parent1.importedModules = new Set([child1, child2])
  parent2.importedModules = new Set([child1, child2])

  expect(isImporter('parent1.js')(parent2)).toBe(false)
})

test('no sibling match for child', () => {
  const parent1 = createModuleNode('parent1.js')
  const parent2 = createModuleNode('parent2.js')
  const child1 = createModuleNode('child.js')
  const child2 = createModuleNode('child.js')
  child1.importers = new Set([parent1, parent2])
  child2.importers = new Set([parent1, parent2])
  parent1.importedModules = new Set([child1, child2])
  parent2.importedModules = new Set([child1, child2])

  expect(isImporter('child1.js')(child2)).toBe(false)
})

test('handles cyclical dependencies', () => {
  const parent1 = createModuleNode('parent1.js')
  const parent2 = createModuleNode('parent2.js')
  const step1 = createModuleNode('step1.js')
  const step2 = createModuleNode('step2.js')
  const step3 = createModuleNode('step3.js')
  const step4 = createModuleNode('step4.js')
  parent1.importedModules.add(step1)
  parent2.importedModules.add(step2)
  step1.importedModules.add(step2)
  step1.importers = new Set([parent1, step4])
  step2.importedModules.add(step3)
  step2.importers = new Set([parent2, step1])
  step3.importedModules.add(step4)
  step3.importers.add(step2)
  step4.importedModules.add(step1)
  step4.importers.add(step3)

  expect(isImporter('parent1.js')(step4)).toBe(true)
  expect(isImporter('step1.js')(step4)).toBe(true)
  expect(isImporter('step4.js')(step2)).toBe(true)
})
