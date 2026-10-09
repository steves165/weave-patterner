import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CloseIcon from '@mui/icons-material/Close'
import ExploreIcon from '@mui/icons-material/Explore'
import SearchIcon from '@mui/icons-material/Search'
import {
  Box,
  Button,
  Dialog,
  IconButton,
  InputAdornment,
  Link,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Fragment, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { usePhone } from '../layout'
import { MONO_FONT } from '../theme'
import { type Block, searchTopics, type Topic } from './types'

/** Text with **bold** and [[topic|links]] turned into elements. */
function Rich({ text, onTopic }: { text: string; onTopic: (id: string) => void }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\])/g)
  return (
    <>
      {parts.map((part, i) => {
        const bold = /^\*\*(.+)\*\*$/.exec(part)
        if (bold)
          // biome-ignore lint/suspicious/noArrayIndexKey: pieces of one string, in order
          return <strong key={i}>{bold[1]}</strong>
        const link = /^\[\[([^|\]]+)\|([^\]]+)\]\]$/.exec(part)
        if (link)
          return (
            <Link
              // biome-ignore lint/suspicious/noArrayIndexKey: pieces of one string, in order
              key={i}
              component="button"
              onClick={() => onTopic(link[1])}
              sx={{ font: 'inherit', verticalAlign: 'baseline' }}
            >
              {link[2]}
            </Link>
          )
        // biome-ignore lint/suspicious/noArrayIndexKey: pieces of one string, in order
        return <Fragment key={i}>{part}</Fragment>
      })}
    </>
  )
}

/** A key, drawn as a keycap: "Ctrl", "Z". */
const Key = ({ children }: { children: ReactNode }) => (
  <Box
    component="kbd"
    sx={{
      fontFamily: MONO_FONT,
      fontSize: 12,
      px: 0.75,
      py: 0.25,
      borderRadius: 1.5,
      border: 1,
      borderColor: 'divider',
      borderBottomWidth: 2,
      bgcolor: 'background.paper',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </Box>
)

function BlockView({ block, onTopic }: { block: Block; onTopic: (id: string) => void }) {
  const rich = (t: string) => <Rich text={t} onTopic={onTopic} />
  if ('h' in block)
    return (
      <Typography variant="h3" sx={{ fontSize: 16, mt: 2.5, mb: 1 }}>
        {block.h}
      </Typography>
    )
  if ('p' in block) return <Typography sx={{ mb: 1.5, lineHeight: 1.6 }}>{rich(block.p)}</Typography>
  if ('tip' in block)
    return (
      <Box sx={{ mb: 1.5, px: 2, py: 1.25, borderRadius: 3, bgcolor: 'var(--wp-seg)', lineHeight: 1.55 }} role="note">
        <strong>Tip: </strong>
        {rich(block.tip)}
      </Box>
    )
  if ('list' in block || 'steps' in block) {
    const items = 'list' in block ? block.list : block.steps
    return (
      <Box
        component={'list' in block ? 'ul' : 'ol'}
        sx={{ mt: 0, mb: 1.5, pl: 3, '& li': { mb: 0.75, lineHeight: 1.55 } }}
      >
        {items.map((item) => (
          <li key={item}>{rich(item)}</li>
        ))}
      </Box>
    )
  }
  const rows = 'keys' in block ? block.keys : block.terms
  return (
    <Box
      component="dl"
      sx={{
        display: 'grid',
        gridTemplateColumns: 'keys' in block ? 'max-content 1fr' : 'minmax(90px, max-content) 1fr',
        gap: '8px 16px',
        mt: 0,
        mb: 2,
        '& dt': { fontWeight: 600 },
        '& dd': { m: 0, lineHeight: 1.5 },
      }}
    >
      {rows.map(([k, v]) => (
        <Fragment key={k}>
          <dt>
            {'keys' in block
              ? k.split(' ').map((key, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: keys of one shortcut, in order
                  <Fragment key={i}>
                    {i > 0 && ' '}
                    {key === '+' || key === 'or' ? key : <Key>{key}</Key>}
                  </Fragment>
                ))
              : k}
          </dt>
          <dd>{rich(v)}</dd>
        </Fragment>
      ))}
    </Box>
  )
}

interface Props {
  open: boolean
  /** "Weave Patterner" or "Knit Patterner". */
  app: string
  topics: Topic[]
  /** The topic to show on opening (from F1 over part of the app), else the first. */
  topic: string | null
  onClose: () => void
  /** Starts the guided tour. */
  onTour: () => void
}

/**
 * The help centre: guides to every part of the app, searchable, with links between them, a glossary and the
 * keyboard shortcuts. Opens from the Help link at the bottom of the page, or F1 (at the topic for what's being
 * pointed at or worked on).
 */
export function HelpCenter({ open, app, topics, topic, onClose, onTour }: Props) {
  const phone = usePhone()
  const [current, setCurrent] = useState(topics[0].id)
  const [query, setQuery] = useState('')
  // On phones the list and the topic take turns.
  const [reading, setReading] = useState(false)
  const content = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    setQuery('')
    setCurrent(topic && topics.some((t) => t.id === topic) ? topic : topics[0].id)
    setReading(Boolean(topic))
  }, [open, topic, topics])
  const go = (id: string) => {
    if (id === 'tour') return onTour()
    if (!topics.some((t) => t.id === id)) return
    setCurrent(id)
    setReading(true)
    content.current?.scrollTo({ top: 0 })
  }
  const shown = useMemo(() => searchTopics(topics, query), [topics, query])
  const t = topics.find((x) => x.id === current) ?? topics[0]
  const showList = !phone || !reading
  const showTopic = !phone || reading

  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} maxWidth="lg" fullWidth aria-labelledby="help-title">
      <Stack
        direction="row"
        sx={{ alignItems: 'center', gap: 1, px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider' }}
      >
        {phone && reading && (
          <IconButton aria-label="All help topics" onClick={() => setReading(false)}>
            <ArrowBackIcon />
          </IconButton>
        )}
        <Typography id="help-title" variant="h2" sx={{ fontSize: 20, flex: 1 }}>
          {app} help
        </Typography>
        <Button startIcon={<ExploreIcon />} onClick={onTour}>
          Take the tour
        </Button>
        <IconButton aria-label="Close help" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>
      <Stack direction="row" sx={{ height: phone ? 'calc(100dvh - 65px)' : '72vh', minHeight: 0 }}>
        {showList && (
          <Box
            component="nav"
            aria-label="Help topics"
            sx={{
              width: phone ? '100%' : 300,
              flex: 'none',
              borderRight: phone ? 0 : 1,
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <Box sx={{ p: 1.5 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search help"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                slotProps={{
                  htmlInput: { 'aria-label': 'Search help' },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
            <List dense sx={{ overflowY: 'auto', flex: 1, pt: 0 }}>
              {shown.map((x) => (
                <ListItemButton
                  key={x.id}
                  selected={!phone && x.id === t.id}
                  onClick={() => go(x.id)}
                  data-topic={x.id}
                  sx={{ borderRadius: 3, mx: 1 }}
                >
                  <ListItemText primary={x.title} secondary={x.summary} />
                </ListItemButton>
              ))}
              {shown.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ px: 2.5, py: 1 }}>
                  Nothing matches "{query}". Try another word, or browse the topics.
                </Typography>
              )}
            </List>
          </Box>
        )}
        {showTopic && (
          <Box
            ref={content}
            component="article"
            aria-label={t.title}
            data-testid="help-topic"
            sx={{ flex: 1, minWidth: 0, overflowY: 'auto', px: { xs: 2.5, sm: 4 }, py: 3 }}
          >
            <Typography variant="h2" sx={{ fontSize: 24, mb: 0.5 }}>
              {t.title}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2.5 }}>
              {t.summary}
            </Typography>
            {t.body.map((b, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a topic's blocks, in order
              <BlockView key={i} block={b} onTopic={go} />
            ))}
          </Box>
        )}
      </Stack>
    </Dialog>
  )
}
