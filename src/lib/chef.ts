// Vortex Chef - Recetario local con listas de compras inteligentes.
// Recetas en IndexedDB, lista de compras en localStorage. Todo en tu equipo.

export const CATEGORIES = [
  'Frutas y verduras',
  'Carnes y pescados',
  'Lácteos y huevos',
  'Panadería y cereales',
  'Despensa',
  'Bebidas',
  'Congelados',
  'Limpieza e higiene',
  'Otros',
] as const

export type Category = (typeof CATEGORIES)[number]

/** categorías de ejemplo para autocompletar según palabras clave */
const KEYWORDS: [string, Category][] = [
  ['tomate', 'Frutas y verduras'], ['cebolla', 'Frutas y verduras'], ['ajo', 'Frutas y verduras'],
  ['papa', 'Frutas y verduras'], ['patata', 'Frutas y verduras'], ['zanahoria', 'Frutas y verduras'],
  ['lechuga', 'Frutas y verduras'], ['manzana', 'Frutas y verduras'], ['plátano', 'Frutas y verduras'],
  ['limón', 'Frutas y verduras'], ['pera', 'Frutas y verduras'], ['pimiento', 'Frutas y verduras'],
  ['calabaza', 'Frutas y verduras'], ['aguacate', 'Frutas y verduras'], ['palta', 'Frutas y verduras'],
  ['pollo', 'Carnes y pescados'], ['carne', 'Carnes y pescados'], ['res', 'Carnes y pescados'],
  ['cerdo', 'Carnes y pescados'], ['cerdo|marrano', 'Carnes y pescados'], ['tocino', 'Carnes y pescados'],
  ['jamón', 'Carnes y pescados'], ['pescado', 'Carnes y pescados'], ['atún', 'Carnes y pescados'],
  ['salmón', 'Carnes y pescados'], ['camarón', 'Carnes y pescados'], ['chuleta', 'Carnes y pescados'],
  ['leche', 'Lácteos y huevos'], ['queso', 'Lácteos y huevos'], ['mantequilla', 'Lácteos y huevos'],
  ['yogur', 'Lácteos y huevos'], ['crema', 'Lácteos y huevos'], ['huevo', 'Lácteos y huevos'],
  ['pan', 'Panadería y cereales'], ['harina', 'Panadería y cereales'], ['arroz', 'Panadería y cereales'],
  ['pasta', 'Panadería y cereales'], ['avena', 'Panadería y cereales'], ['tortilla', 'Panadería y cereales'],
  ['azúcar', 'Despensa'], ['sal', 'Despensa'], ['aceite', 'Despensa'], ['frijol', 'Despensa'],
  ['frijoles', 'Despensa'], ['lenteja', 'Despensa'], ['café', 'Despensa'], ['vinagre', 'Despensa'],
  ['miel', 'Despensa'], ['chile', 'Despensa'], ['pimienta', 'Despensa'], ['conserva', 'Despensa'],
  ['agua', 'Bebidas'], ['jugo', 'Bebidas'], ['refresco', 'Bebidas'], ['soda', 'Bebidas'],
  ['vino', 'Bebidas'], ['cerveza', 'Bebidas'], ['té', 'Bebidas'],
  ['helado', 'Congelados'], ['congelad', 'Congelados'], ['verduras congeladas', 'Congelados'],
  ['detergente', 'Limpieza e higiene'], ['jabón', 'Limpieza e higiene'], ['cloro', 'Limpieza e higiene'],
  ['papel', 'Limpieza e higiene'], ['shampoo', 'Limpieza e higiene'], ['esponja', 'Limpieza e higiene'],
]

export function guessCategory(name: string): Category {
  const low = name.toLowerCase()
  for (const [kw, cat] of KEYWORDS) {
    if (low.includes(kw.split('|')[0])) return cat
  }
  return 'Otros'
}

export interface Ingredient {
  name: string
  qty: number
  unit: string
  category: Category
}

export interface Recipe {
  id: string
  name: string
  baseServings: number
  ingredients: Ingredient[]
  steps: string
  tags: string[]
  favorite: boolean
  createdAt: number
}

export function newRecipe(): Recipe {
  return {
    id: Math.random().toString(36).slice(2, 10),
    name: '',
    baseServings: 4,
    ingredients: [{ name: '', qty: 1, unit: '', category: 'Otros' }],
    steps: '',
    tags: [],
    favorite: false,
    createdAt: Date.now(),
  }
}

// ---------- IndexedDB para recetas ----------

const DB_NAME = 'vortex-chef'
const STORE = 'recipes'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('No pude abrir la base local'))
  })
}

export async function listRecipes(): Promise<Recipe[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
    req.onsuccess = () => {
      const list = (req.result as Recipe[]).sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name))
      resolve(list)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function saveRecipe(r: Recipe): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(r)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteRecipe(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ---------- lista de compras (localStorage) ----------

const LIST_KEY = 'vortex-chef-list'

export interface ListRow {
  id: string
  name: string
  qty: number
  unit: string
  category: Category
  bought: boolean
  /** recetas que la pidieron (etiquetas informativas) */
  from: string[]
}

export function loadList(): ListRow[] {
  try {
    const raw = localStorage.getItem(LIST_KEY)
    const list = raw ? (JSON.parse(raw) as ListRow[]) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function persistList(list: ListRow[]): void {
  localStorage.setItem(LIST_KEY, JSON.stringify(list))
}

export interface ListAddition {
  recipeId: string
  recipeName: string
  servings: number
}

/** añade a la lista los ingredientes de recetas escaladas, agregando iguales */
export function buildListRows(recipes: (Recipe & { servingsWanted: number })[]): ListRow[] {
  const map = new Map<string, ListRow>()
  for (const r of recipes) {
    if (!r.ingredients.length || !r.servingsWanted) continue
    const factor = r.baseServings > 0 ? r.servingsWanted / r.baseServings : 1
    for (const ing of r.ingredients) {
      const name = ing.name.trim()
      if (!name) continue
      const key = `${name.toLowerCase().normalize('NFC')}|${ing.unit.trim().toLowerCase()}`
      const qty = (Number(ing.qty) || 0) * factor
      const existing = map.get(key)
      if (existing) {
        existing.qty = Math.round((existing.qty + qty) * 1000) / 1000
        if (!existing.from.includes(r.name || 'receta')) existing.from.push(r.name || 'receta')
      } else {
        map.set(key, {
          id: Math.random().toString(36).slice(2, 10),
          name,
          qty: Math.round(qty * 1000) / 1000,
          unit: ing.unit.trim(),
          category: ing.category || guessCategory(name),
          bought: false,
          from: [r.name || 'receta'],
        })
      }
    }
  }
  const rows = Array.from(map.values())
  rows.sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name))
  return rows
}

export function fmtQty(n: number): string {
  if (Number.isInteger(n)) return String(n)
  return String(parseFloat(n.toFixed(3)))
}
