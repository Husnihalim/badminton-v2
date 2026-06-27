import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  Camera,
  Check,
  Filter,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Tag,
} from 'lucide-react'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'

type MarketplaceCategory = 'gear' | 'apparel' | 'court' | 'coaching' | 'wanted'
type MarketplaceCondition = 'New' | 'Like new' | 'Good' | 'Well used' | 'Wanted'

interface MarketplaceListing {
  id: string
  title: string
  category: MarketplaceCategory
  price: number | null
  condition: MarketplaceCondition
  seller: string
  sellerBadge: string
  location: string
  postedAt: string
  description: string
  imageClass: string
  status: 'available' | 'reserved' | 'wanted'
  trustSignals: string[]
}

const categoryLabels: Record<MarketplaceCategory | 'all', string> = {
  all: 'All',
  gear: 'Gear',
  apparel: 'Kit',
  court: 'Courts',
  coaching: 'Coaching',
  wanted: 'Wanted',
}

const seedListings: MarketplaceListing[] = [
  {
    id: 'yonex-astrox-88d',
    title: 'Yonex Astrox 88D Pro',
    category: 'gear',
    price: 420,
    condition: 'Good',
    seller: 'Aiman Rahman',
    sellerBadge: 'Club player',
    location: 'Subang Jaya',
    postedAt: '2h ago',
    description: '4U/G5, freshly regripped, minor paint chips near frame. Best for rear-court doubles players.',
    imageClass: 'from-lime-300/35 via-sky-400/20 to-slate-900',
    status: 'available',
    trustSignals: ['23 matches recorded', 'Active member'],
  },
  {
    id: 'victor-shoes',
    title: 'Victor A970 NitroLite shoes',
    category: 'apparel',
    price: 180,
    condition: 'Like new',
    seller: 'Mei Lin',
    sellerBadge: 'Verified member',
    location: 'Petaling Jaya',
    postedAt: 'Yesterday',
    description: 'EU 41. Used twice on indoor courts only. Selling because size is slightly tight.',
    imageClass: 'from-sky-300/30 via-white/10 to-slate-950',
    status: 'reserved',
    trustSignals: ['Admin verified', 'Same club'],
  },
  {
    id: 'sunday-court-slot',
    title: 'Sunday court slot transfer',
    category: 'court',
    price: 36,
    condition: 'New',
    seller: 'KelabSukan Arena',
    sellerBadge: 'Court slot',
    location: 'Court 5, 8-9pm',
    postedAt: 'Today',
    description: 'Paid court slot available because one pair pulled out. Transfer at original cost.',
    imageClass: 'from-emerald-400/20 via-lime-300/20 to-slate-900',
    status: 'available',
    trustSignals: ['Original cost', 'Club visible'],
  },
  {
    id: 'beginner-sparring',
    title: 'Beginner sparring session',
    category: 'coaching',
    price: 45,
    condition: 'New',
    seller: 'Coach Hafiz',
    sellerBadge: 'Coach',
    location: 'Friday night',
    postedAt: '3d ago',
    description: 'One-hour guided sparring for beginners who want game feedback before club night.',
    imageClass: 'from-cyan-400/25 via-lime-300/15 to-slate-950',
    status: 'available',
    trustSignals: ['Coach profile', 'Member reviewed'],
  },
  {
    id: 'wanted-shuttle-tubes',
    title: 'Looking for shuttle tubes',
    category: 'wanted',
    price: null,
    condition: 'Wanted',
    seller: 'Nadia Sofea',
    sellerBadge: 'Buyer',
    location: 'Any KL club',
    postedAt: '4d ago',
    description: 'Need two decent feather shuttle tubes for weekend training. Open to opened tubes.',
    imageClass: 'from-slate-700 via-slate-800 to-slate-950',
    status: 'wanted',
    trustSignals: ['Active buyer', 'Same club'],
  },
]

function formatPrice(price: number | null) {
  return price === null ? 'Offer' : `RM ${price}`
}

function ListingArtwork({ listing }: { listing: MarketplaceListing }) {
  return (
    <div className={`relative flex aspect-[4/3] min-h-[132px] items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br ${listing.imageClass}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
      <ShoppingBag className="relative h-12 w-12 text-white/80" aria-hidden="true" />
      <span className="absolute bottom-2 left-2 rounded-md border border-white/10 bg-black/45 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur">
        {categoryLabels[listing.category]}
      </span>
    </div>
  )
}

export function ClubMarketplace({ clubName, isMember }: { clubName: string; isMember: boolean }) {
  const [category, setCategory] = useState<MarketplaceCategory | 'all'>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'fresh' | 'price-low' | 'price-high'>('fresh')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const listings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const filtered = seedListings.filter((listing) => {
      const matchesCategory = category === 'all' || listing.category === category
      const matchesQuery = !normalizedQuery || [
        listing.title,
        listing.description,
        listing.seller,
        listing.location,
      ].some((value) => value.toLowerCase().includes(normalizedQuery))

      return matchesCategory && matchesQuery
    })

    return [...filtered].sort((a, b) => {
      if (sort === 'price-low') return (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER)
      if (sort === 'price-high') return (b.price ?? 0) - (a.price ?? 0)
      return seedListings.findIndex((listing) => listing.id === a.id) - seedListings.findIndex((listing) => listing.id === b.id)
    })
  }, [category, query, sort])

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-[var(--arena-border)] bg-[var(--arena-surface)] shadow-xl">
        <div className="grid gap-4 p-4 sm:grid-cols-[1.4fr_0.8fr] sm:p-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border border-[var(--arena-accent)]/20 bg-[var(--arena-accent-soft)] text-[var(--arena-accent)]">
                Buy/Sell
              </Badge>
              <Badge variant="muted">Member-first marketplace</Badge>
            </div>
            <div>
              <h2 className="text-xl font-black tracking-normal text-[var(--arena-text)] sm:text-2xl">
                Buy, sell, and swap inside {clubName}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--arena-text-muted)]">
                A trusted club layer for rackets, shoes, court slots, coaching sessions, and wanted posts before opening listings to nearby clubs.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { icon: ShieldCheck, label: 'Club trust', text: 'Listings show member context.' },
                { icon: MessageCircle, label: 'WhatsApp close', text: 'No payment risk in v1.' },
                { icon: Sparkles, label: 'Sports-only', text: 'Focused on real club needs.' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)]/70 p-3">
                    <Icon className="h-4 w-4 text-[var(--arena-accent)]" aria-hidden="true" />
                    <p className="mt-2 text-xs font-black text-[var(--arena-text)]">{item.label}</p>
                    <p className="mt-1 text-[11px] leading-snug text-[var(--arena-text-dim)]">{item.text}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-[var(--arena-border)] bg-[var(--arena-surface-elevated)]/45 p-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[var(--arena-text-dim)]">Marketplace pulse</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-2xl font-black text-[var(--arena-text)]">5</p>
                  <p className="text-[10px] text-[var(--arena-text-dim)]">Listings</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-[var(--arena-accent)]">3</p>
                  <p className="text-[10px] text-[var(--arena-text-dim)]">Verified</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-[var(--arena-blue)]">1</p>
                  <p className="text-[10px] text-[var(--arena-text-dim)]">Reserved</p>
                </div>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => setShowCreateModal(true)}
              disabled={!isMember}
              className="mt-5 w-full bg-[var(--arena-accent)] font-black text-[var(--arena-accent-text)] hover:bg-[var(--arena-accent)]/90 disabled:opacity-50"
            >
              <Plus size={16} aria-hidden="true" />
              Sell or request item
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-[var(--arena-border)] bg-[var(--arena-surface)] p-3 sm:grid-cols-[1fr_170px_150px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--arena-text-dim)]" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search rackets, shoes, court slots"
            className="h-10 border-[var(--arena-border)] bg-[var(--arena-surface-muted)] pl-9 text-sm"
          />
        </label>
        <Select
          value={category}
          onChange={(event) => setCategory(event.target.value as MarketplaceCategory | 'all')}
          className="border-[var(--arena-border)] bg-[var(--arena-surface-muted)]"
          aria-label="Filter by category"
        >
          {Object.entries(categoryLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        <Select
          value={sort}
          onChange={(event) => setSort(event.target.value as 'fresh' | 'price-low' | 'price-high')}
          className="border-[var(--arena-border)] bg-[var(--arena-surface-muted)]"
          aria-label="Sort listings"
        >
          <option value="fresh">Fresh first</option>
          <option value="price-low">Lowest price</option>
          <option value="price-high">Highest price</option>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--arena-text-muted)]">
          <Filter size={14} className="text-[var(--arena-accent)]" aria-hidden="true" />
          {listings.length} visible listings
        </div>
        <div className="hidden items-center gap-2 text-xs text-[var(--arena-text-dim)] sm:flex">
          <SlidersHorizontal size={14} aria-hidden="true" />
          Club-only discovery
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <Card key={listing.id} className="overflow-hidden border-[var(--arena-border)] bg-[var(--arena-surface)]">
            <CardContent className="space-y-3 p-3">
              <ListingArtwork listing={listing} />
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-sm font-black leading-tight text-[var(--arena-text)]">{listing.title}</h3>
                    <p className="mt-1 text-xs text-[var(--arena-text-dim)]">{listing.location}</p>
                  </div>
                  <p className="shrink-0 text-sm font-black text-[var(--arena-accent)]">{formatPrice(listing.price)}</p>
                </div>
                <p className="line-clamp-2 min-h-9 text-xs leading-relaxed text-[var(--arena-text-muted)]">{listing.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={listing.status === 'available' ? 'live' : listing.status === 'reserved' ? 'blue' : 'muted'}>
                  {listing.status}
                </Badge>
                <Badge variant="muted">{listing.condition}</Badge>
                <Badge className="border border-[var(--arena-border)] bg-transparent text-[var(--arena-text-muted)]">
                  <Tag size={11} aria-hidden="true" />
                  {categoryLabels[listing.category]}
                </Badge>
              </div>

              <div className="rounded-lg border border-[var(--arena-border)] bg-[var(--arena-surface-muted)]/60 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-[var(--arena-text)]">{listing.seller}</p>
                    <p className="text-[10px] text-[var(--arena-text-dim)]">{listing.sellerBadge} · {listing.postedAt}</p>
                  </div>
                  <BadgeCheck className="h-4 w-4 shrink-0 text-[var(--arena-blue)]" aria-hidden="true" />
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {listing.trustSignals.map((signal) => (
                    <span key={signal} className="inline-flex items-center gap-1 rounded-md bg-black/20 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--arena-text-muted)]">
                      <Check size={10} className="text-[var(--arena-accent)]" aria-hidden="true" />
                      {signal}
                    </span>
                  ))}
                </div>
              </div>

              <Button type="button" variant="secondary" className="w-full border border-[var(--arena-border)] bg-[var(--arena-surface-muted)] text-[var(--arena-text)] hover:bg-[var(--arena-accent-soft)]">
                <MessageCircle size={15} aria-hidden="true" />
                Contact seller
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {listings.length === 0 ? (
        <div className="rounded-xl border border-[var(--arena-border)] bg-[var(--arena-surface)] p-6 text-center">
          <ShoppingBag className="mx-auto h-8 w-8 text-[var(--arena-text-dim)]" aria-hidden="true" />
          <p className="mt-3 text-sm font-black text-[var(--arena-text)]">No listings match this view.</p>
          <p className="mt-1 text-xs text-[var(--arena-text-muted)]">Try a different category or search term.</p>
        </div>
      ) : null}

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="border border-[var(--arena-border)] bg-[var(--arena-surface-elevated)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[var(--arena-text)]">Create marketplace listing</DialogTitle>
            <DialogDescription>
              First version captures listing intent for club review. Payments and delivery stay outside the app.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <Input placeholder="Item or request title" className="border-[var(--arena-border)] bg-[var(--arena-surface)]" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select className="border-[var(--arena-border)] bg-[var(--arena-surface)]" defaultValue="gear">
                <option value="gear">Gear</option>
                <option value="apparel">Kit</option>
                <option value="court">Court slot</option>
                <option value="coaching">Coaching</option>
                <option value="wanted">Wanted</option>
              </Select>
              <Input placeholder="Price, e.g. RM 120" className="border-[var(--arena-border)] bg-[var(--arena-surface)]" />
            </div>
            <div className="rounded-lg border border-dashed border-[var(--arena-border)] bg-[var(--arena-surface)] p-4 text-center">
              <Camera className="mx-auto h-6 w-6 text-[var(--arena-accent)]" aria-hidden="true" />
              <p className="mt-2 text-xs font-bold text-[var(--arena-text)]">Add item photos</p>
              <p className="mt-1 text-[11px] text-[var(--arena-text-dim)]">Photo upload connects in the database-backed version.</p>
            </div>
          </div>

          <DialogFooter className="border-[var(--arena-border)] bg-[var(--arena-surface)]">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="bg-[var(--arena-accent)] font-black text-[var(--arena-accent-text)] hover:bg-[var(--arena-accent)]/90"
            >
              Save draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
