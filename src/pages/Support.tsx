import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import Icon from '@/components/ui/icon'

const TICKETS_URL = 'https://functions.poehali.dev/f618e2a4-a610-4919-a3cc-873a42c50a49'

interface Ticket {
  id: number
  subject: string
  status: string
  priority: string
  created_at: string
  creator_name: string
}

interface User {
  id: number
  email: string
  full_name: string
  role: string
}

export default function Support() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      navigate('/login')
      return
    }
    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== 'support' && parsedUser.role !== 'admin') {
      navigate('/dashboard')
      return
    }
    setUser(parsedUser)
    loadAllTickets()
  }, [navigate])

  const loadAllTickets = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(TICKETS_URL, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (response.ok) {
        setTickets(data.tickets || [])
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить заявки', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const updateTicketStatus = async (ticketId: number, newStatus: string) => {
    try {
      const response = await fetch(TICKETS_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId, status: newStatus })
      })
      if (response.ok) {
        toast({ title: 'Успешно', description: 'Статус обновлен' })
        loadAllTickets()
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось обновить статус', variant: 'destructive' })
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      open: 'default',
      in_progress: 'secondary',
      resolved: 'outline',
      closed: 'outline'
    }
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      low: 'outline',
      medium: 'secondary',
      high: 'default',
      urgent: 'destructive'
    }
    return <Badge variant={variants[priority] || 'default'}>{priority}</Badge>
  }

  const groupedTickets = {
    open: tickets.filter((t) => t.status === 'open'),
    in_progress: tickets.filter((t) => t.status === 'in_progress'),
    resolved: tickets.filter((t) => t.status === 'resolved' || t.status === 'closed')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Icon name="Shield" size={28} />
            <h1 className="text-xl font-bold">Панель техподдержки</h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">{user?.role}</Badge>
            <span className="text-sm text-muted-foreground">{user?.full_name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Выход
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Все заявки</h2>
          <p className="text-muted-foreground">Обработка обращений пользователей</p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Новые</CardDescription>
              <CardTitle className="text-4xl">{groupedTickets.open.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>В работе</CardDescription>
              <CardTitle className="text-4xl">{groupedTickets.in_progress.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Решенные</CardDescription>
              <CardTitle className="text-4xl">{groupedTickets.resolved.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Загрузка...</p>
            </CardContent>
          </Card>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Icon name="Inbox" size={48} className="mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Заявок пока нет</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedTickets).map(([status, statusTickets]) => {
              if (statusTickets.length === 0) return null
              return (
                <div key={status}>
                  <h3 className="mb-4 text-xl font-semibold capitalize">
                    {status === 'open' ? 'Новые' : status === 'in_progress' ? 'В работе' : 'Решенные'}
                  </h3>
                  <div className="grid gap-4">
                    {statusTickets.map((ticket) => (
                      <Card key={ticket.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                              <CardDescription>
                                От: {ticket.creator_name} • {new Date(ticket.created_at).toLocaleString('ru-RU')}
                              </CardDescription>
                            </div>
                            <div className="flex gap-2">
                              {getStatusBadge(ticket.status)}
                              {getPriorityBadge(ticket.priority)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-2">
                            {ticket.status === 'open' && (
                              <Button size="sm" onClick={() => updateTicketStatus(ticket.id, 'in_progress')}>
                                Взять в работу
                              </Button>
                            )}
                            {ticket.status === 'in_progress' && (
                              <Button size="sm" onClick={() => updateTicketStatus(ticket.id, 'resolved')}>
                                Решить
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
