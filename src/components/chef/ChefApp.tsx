'use client'

// Vortex Chef - Recetario + listas de compras agrupadas por categoría.
// Recetas en IndexedDB, lista en localStorage: todo en tu equipo.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChefHat,
  CookingPot,
  ShoppingCart,
  Plus,
  Trash2,
  Save,
  Star,
  Copy,
  Check,
  Search,
  X,
  ClipboardCopy,
} from 'lucide-react'
import {
  buildListRows,
  CATEGORIES,
  deleteRecipe,
  fmtQty,
  guessCategory,
  listRecipes,
  loadList,
  newRecipe,
  persistList,
  saveRecipe,
  type Category,
  type ListRow,
  type Recipe,
} from '@/lib/chef'

const SUPPORT_EMAIL = 'vortexmusic.soporte.app@gmail.com'
const ACCENT = '#fb7185'
const ACCENT2 = '#fda4af'

function VortexLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="10" fill="#161616" />
      <circle cx="24" cy="24" r="17" fill="none" stroke={ACCENT} strokeWidth="3.5" />
      <path d="M24 10a14 14 0 1 1-9.9 4.1" fill="none" stroke={ACCENT2} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M24 17a7 7 0 1 0 7 7" fill="none" stroke={ACCENT2} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M17 25h6M20 22v6M26 22h2.5a2.5 2.5 0 0 1 0 5H26v-5z" fill="none" stroke={ACCENT2} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-[#2b2b31] bg-[#141416] px-6 py-4">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-1 text-center">
        <p className="text-[11px] text-[#9b9ba4]">
          Vórtex Chef · Derechos Reservados © 2026 Vortex Company ·{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#fda4af] hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p className="text-[11px] text-[#9b9ba4]">Gratis · Sin anuncios · 100% local en tu navegador</p>
      </div>
    </footer>
  )
}

const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#2b2b31] bg-[#1e1e22] px-3 py-2 text-xs font-medium text-[#ececf1] hover:bg-[#26262b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

const btnAccent =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#0f0f10] transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[#fb7185] hover:bg-[#fda4af]'

const field =
  'w-full rounded-lg border border-[#2b2b31] bg-[#0f0f10] px-3 py-2 text-sm text-[#ececf1] outline-none focus:border-[#fb7185]'

type Tab = 'recipes' | 'list'

/** estado de edición: receta + porciones deseadas */
interface Draft {
  recipe: Recipe
  servings: number
}

export default function ChefApp() {
  const [tab, setTab] = useState<Tab>('recipes')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [query, setQuery] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [list, setList] = useState<ListRow[]>([])
  const [servingsWanted, setServingsWanted] = useState<Record<string, number>>({})
  const listRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async () => {
    try {
      setRecipes(await listRecipes())
      setList(loadList())
    } catch {
      setErr('No pude leer el almacenamiento local (IndexedDB bloqueada).')
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(''), 2500)
  }

  // ----- editor -----
  const openNew = () => setDraft({ recipe: newRecipe(), servings: 4 })
  const openEdit = (r: Recipe) => setDraft({ recipe: JSON.parse(JSON.stringify(r)) as Recipe, servings: r.baseServings })

  const updateDraft = (patch: Partial<Recipe>) => setDraft((d) => (d ? { ...d, recipe: { ...d.recipe, ...patch } } : d))
  const updateIngredient = (idx: number, patch: Partial<Recipe['ingredients'][number]>) =>
    setDraft((d) => (d ? { ...d, recipe: { ...d.recipe, ingredients: d.recipe.ingredients.map((it, k) => (k === idx ? { ...it, ...patch } : it)) } } : d))

  const doSave = async () => {
    if (!draft) return
    if (!draft.recipe.name.trim()) {
      setErr('La receta necesita un nombre.')
      return
    }
    setErr('')
    const r: Recipe = { ...draft.recipe, baseServings: Math.max(1, draft.servings) }
    await saveRecipe(r)
    await refresh()
    setDraft(null)
    flash(`"${r.name}" guardada en tu equipo.`)
  }

  const doDelete = async (r: Recipe) => {
    await deleteRecipe(r.id)
    await refresh()
    flash(`"${r.name}" eliminada.`)
  }

  const toggleFav = async (r: Recipe) => {
    await saveRecipe({ ...r, favorite: !r.favorite })
    await refresh()
  }

  // ----- lista de compras -----
  const addToList = (r: Recipe) => {
    const wanted = servingsWanted[r.id] ?? r.baseServings
    const current = loadList()
    const rows = buildListRows([{ ...r, servingsWanted: wanted }])
    // agregamos sobre lo que ya hay, sin perder lo comprado
    const merged = [...current]
    for (const row of rows) {
      const match = merged.find((m) => m.name.toLowerCase() === row.name.toLowerCase() && m.unit.toLowerCase() === row.unit.toLowerCase())
      if (match) {
        match.qty = Math.round((match.qty + row.qty) * 1000) / 1000
        if (!match.from.includes(r.name || 'receta')) match.from.push(r.name || 'receta')
      } else merged.push(row)
    }
    persistList(merged)
    setList(merged)
    flash(`"${r.name}" agregada a la lista (${wanted} porciones).`)
    setTab('list')
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const toggleBought = (id: string) => {
    const next = list.map((r) => (r.id === id ? { ...r, bought: !r.bought } : r))
    setList(next)
    persistList(next)
  }

  const removeRow = (id: string) => {
    const next = list.filter((r) => r.id !== id)
    setList(next)
    persistList(next)
  }

  const clearBought = () => {
    const next = list.filter((r) => !r.bought)
    setList(next)
    persistList(next)
  }

  const clearAll = () => {
    setList([])
    persistList([])
  }

  const grouped = useMemo(() => {
    const groups = new Map<Category, { row: ListRow; index: number }[]>()
    list.forEach((row, index) => {
      const cat = row.category
      if (!groups.has(cat)) groups.set(cat, [])
      groups.get(cat)!.push({ row, index })
    })
    return groups
  }, [list])

  const copyList = async () => {
    const lines: string[] = ['Lista de compras — Vórtex Chef', '']
    for (const [cat, rows] of grouped) {
      lines.push(`## ${cat}`)
      for (const { row } of rows) lines.push(`${row.bought ? '[x]' : '[ ]'} ${row.name} — ${fmtQty(row.qty)}${row.unit ? ' ' + row.unit : ''}`)
      lines.push('')
    }
    await navigator.clipboard.writeText(lines.join('\n')).catch(() => undefined)
    flash('Lista copiada al portapapeles.')
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return recipes
    return recipes.filter((r) => r.name.toLowerCase().includes(q) || r.tags.some((t) => t.toLowerCase().includes(q)))
  }, [recipes, query])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[#2b2b31] bg-[#141416] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <VortexLogo className="w-9 h-9" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight">
              Vórtex Chef <span className="font-normal text-[#9b9ba4]">· Cocina y compra sin límites</span>
            </h1>
            <p className="text-[11px] text-[#9b9ba4]">Recetario local y listas de compras por categoría · nada sale de tu equipo</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {/* pestañas */}
        <div className="mb-4 flex gap-1 rounded-xl border border-[#2b2b31] bg-[#17171a] p-1">
          {(
            [
              { id: 'recipes', label: `Recetario (${recipes.length})`, icon: CookingPot },
              { id: 'list', label: `Compras (${list.filter((r) => !r.bought).length})`, icon: ShoppingCart },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                tab === t.id ? 'bg-[#26262b] text-[#ececf1]' : 'text-[#9b9ba4] hover:text-[#ececf1]'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {msg && <p className="mb-3 text-xs text-[#4ade80]">{msg}</p>}
        {err && <p className="mb-3 text-xs text-[#f87171]">{err}</p>}

        {tab === 'recipes' && !draft && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button className={btnAccent} onClick={openNew}>
                <Plus className="h-3.5 w-3.5" /> Nueva receta
              </button>
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9b9ba4]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre o etiqueta…"
                  className={`${field} pl-9`}
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-8 text-center">
                <ChefHat className="mx-auto h-10 w-10 text-[#fda4af]" />
                <p className="mt-3 text-sm text-[#9b9ba4]">
                  {recipes.length === 0 ? 'Guarda tu primera receta y empieza tu recetario.' : 'Ninguna receta coincide con la búsqueda.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filtered.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{r.name}</p>
                        <p className="mt-0.5 text-[11px] text-[#9b9ba4]">
                          {r.ingredients.filter((i) => i.name.trim()).length} ingredientes · base {r.baseServings} porciones
                        </p>
                      </div>
                      <button className={r.favorite ? 'text-[#facc15]' : 'text-[#9b9ba4] hover:text-[#facc15]'} onClick={() => void toggleFav(r)} title="Favorita">
                        <Star className={`h-4 w-4 ${r.favorite ? 'fill-[#facc15]' : ''}`} />
                      </button>
                    </div>
                    {r.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {r.tags.map((t) => (
                          <span key={t} className="rounded-md bg-[#26262b] px-2 py-0.5 text-[10px] text-[#9b9ba4]">{t}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5 text-[11px] text-[#9b9ba4]">
                        porciones
                        <input
                          type="number"
                          min={1}
                          value={servingsWanted[r.id] ?? r.baseServings}
                          onChange={(e) => setServingsWanted((s) => ({ ...s, [r.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                          className="w-14 rounded-md border border-[#2b2b31] bg-[#0f0f10] px-1.5 py-1 text-xs outline-none focus:border-[#fb7185]"
                        />
                      </label>
                      <button className={btnAccent} onClick={() => addToList(r)}>
                        <ShoppingCart className="h-3.5 w-3.5" /> A la lista
                      </button>
                      <button className={btn} onClick={() => openEdit(r)}>
                        Editar
                      </button>
                      <button className="text-[#9b9ba4] hover:text-[#f87171]" title="Eliminar receta" onClick={() => void doDelete(r)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'recipes' && draft && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-5">
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <label className="text-xs text-[#9b9ba4]">
                  Nombre de la receta
                  <input value={draft.recipe.name} onChange={(e) => updateDraft({ name: e.target.value })} placeholder="Lasaña de la abuela" className={`${field} mt-1.5`} />
                </label>
                <label className="text-xs text-[#9b9ba4]">
                  Porciones base
                  <input
                    type="number"
                    min={1}
                    value={draft.servings}
                    onChange={(e) => setDraft((d) => (d ? { ...d, servings: Math.max(1, parseInt(e.target.value) || 1) } : d))}
                    className={`${field} mt-1.5`}
                  />
                </label>
              </div>
              <label className="mt-3 block text-xs text-[#9b9ba4]">
                Etiquetas (separadas por coma)
                <input
                  value={draft.recipe.tags.join(', ')}
                  onChange={(e) => updateDraft({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
                  placeholder="italiana, cena, rápida"
                  className={`${field} mt-1.5`}
                />
              </label>
            </div>

            <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#9b9ba4]">Ingredientes</p>
                <button
                  className={btn}
                  onClick={() => updateDraft({ ingredients: [...draft.recipe.ingredients, { name: '', qty: 1, unit: '', category: 'Otros' }] })}
                >
                  <Plus className="h-3.5 w-3.5" /> Añadir
                </button>
              </div>
              <div className="space-y-2">
                {draft.recipe.ingredients.map((ing, k) => (
                  <div key={k} className="grid grid-cols-[1fr_64px_72px] gap-2 sm:grid-cols-[1fr_64px_72px_1fr_32px]">
                    <input
                      className={field}
                      placeholder="Ingrediente"
                      value={ing.name}
                      onChange={(e) => updateIngredient(k, { name: e.target.value, category: guessCategory(e.target.value) })}
                    />
                    <input type="number" min={0} step="any" className={field} value={ing.qty} onChange={(e) => updateIngredient(k, { qty: parseFloat(e.target.value) || 0 })} title="Cantidad" />
                    <input className={field} placeholder="unidad" value={ing.unit} onChange={(e) => updateIngredient(k, { unit: e.target.value })} title="Unidad (g, ml, tazas…)" />
                    <select
                      className={`${field} hidden sm:block`}
                      value={ing.category}
                      onChange={(e) => updateIngredient(k, { category: e.target.value as Category })}
                      title="Categoría en la tienda"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <button className="justify-self-end text-[#9b9ba4] hover:text-[#f87171]" onClick={() => updateDraft({ ingredients: draft.recipe.ingredients.filter((_, j) => j !== k) })}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-[#9b9ba4]">La categoría se sugiere al escribir el nombre; cámbiala si prefieres otra pasillo.</p>
            </div>

            <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#9b9ba4]">Pasos</p>
              <textarea
                value={draft.recipe.steps}
                onChange={(e) => updateDraft({ steps: e.target.value })}
                rows={6}
                placeholder={'1. Precalienta el horno…\n2. …'}
                className="w-full resize-y rounded-xl border border-[#2b2b31] bg-[#0f0f10] px-3 py-2.5 text-sm outline-none focus:border-[#fb7185]"
              />
            </div>

            <div className="flex gap-2">
              <button className={btnAccent} onClick={doSave}>
                <Save className="h-3.5 w-3.5" /> Guardar receta
              </button>
              <button className={btn} onClick={() => setDraft(null)}>
                <X className="h-3.5 w-3.5" /> Cancelar
              </button>
            </div>
          </div>
        )}

        {tab === 'list' && (
          <div ref={listRef} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#2b2b31] bg-[#17171a] p-4">
              <span className="text-xs text-[#9b9ba4]">
                {list.filter((r) => !r.bought).length} pendientes · {list.filter((r) => r.bought).length} en el carrito
              </span>
              <button className={`${btn} ml-auto`} onClick={clearBought} disabled={!list.some((r) => r.bought)}>
                <Check className="h-3.5 w-3.5" /> Quitar comprados
              </button>
              <button className={btn} onClick={copyList} disabled={!list.length}>
                <ClipboardCopy className="h-3.5 w-3.5" /> Copiar lista
              </button>
              <button className="text-[#9b9ba4] hover:text-[#f87171]" onClick={clearAll} disabled={!list.length} title="Vaciar lista">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {list.length === 0 ? (
              <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-8 text-center">
                <ShoppingCart className="mx-auto h-10 w-10 text-[#fda4af]" />
                <p className="mt-3 text-sm text-[#9b9ba4]">Tu lista está vacía. Ve al recetario y manda una receta con sus porciones.</p>
              </div>
            ) : (
              Array.from(grouped.entries()).map(([cat, rows]) => (
                <div key={cat} className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#fda4af]">{cat}</p>
                  <div className="space-y-1.5">
                    {rows.map(({ row }) => (
                      <label key={row.id} className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#1e1e22] ${row.bought ? 'opacity-50' : ''}`}>
                        <input type="checkbox" checked={row.bought} onChange={() => toggleBought(row.id)} className="h-4 w-4 accent-[#fb7185]" />
                        <span className={`min-w-0 flex-1 text-sm ${row.bought ? 'line-through' : ''}`}>
                          {row.name}
                          {row.from.length > 0 && <span className="ml-2 text-[10px] text-[#9b9ba4]">({row.from.join(', ')})</span>}
                        </span>
                        <span className="shrink-0 font-mono text-xs text-[#ececf1]">
                          {fmtQty(row.qty)}{row.unit ? ` ${row.unit}` : ''}
                        </span>
                        <button className="shrink-0 text-[#9b9ba4] hover:text-[#f87171]" onClick={(e) => { e.preventDefault(); removeRow(row.id) }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}

            <p className="text-[11px] text-[#9b9ba4]">
              La lista se guarda en este navegador: puedes cerrar la pestaña y seguir marcando compras en el súper.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
