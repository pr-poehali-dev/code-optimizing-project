import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  creator_name?: string
}

interface User {
  id: number
  email: string
  full_name: string
  role: string
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTicket, setNewTicket] = useState({ subject: '', description: '', priority: 'medium' })

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      navigate('/login')
      return
    }
    setUser(JSON.parse(userData))
    loadTickets()
  }, [navigate])

  const loadTickets = async () => {
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

  const createTicket = async () => {
    if (!newTicket.subject || !newTicket.description) {
      toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(TICKETS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTicket)
      })
      const data = await response.json()
      if (response.ok) {
        toast({ title: 'Успешно', description: 'Заявка создана' })
        setNewTicket({ subject: '', description: '', priority: 'medium' })
        setShowCreateForm(false)
        loadTickets()
      }
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось создать заявку', variant: 'destructive' })
    } finally {
      setIsLoading(false)
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Icon name="Headset" size={28} />
            <h1 className="text-xl font-bold">HelpDesk Pro</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.full_name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Выход
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Мои заявки</h2>
            <p className="text-muted-foreground">Управление обращениями в техподдержку</p>
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Icon name="Plus" size={16} className="mr-2" />
            Создать заявку
          </Button>
        </div>

        {showCreateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Новая заявка</CardTitle>
              <CardDescription>Опишите вашу проблему или вопрос</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Тема</Label>
                <Input
                  id="subject"
                  placeholder="Краткое описание проблемы"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  placeholder="Подробно опишите ситуацию"
                  rows={5}
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Приоритет</Label>
                <Select value={newTicket.priority} onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                    <SelectItem value="urgent">Срочный</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={createTicket} disabled={isLoading}>
                  {isLoading ? 'Создание...' : 'Создать'}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Отмена
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading && tickets.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Загрузка...</p>
            </CardContent>
          </Card>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Icon name="Inbox" size={48} className="mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">У вас пока нет заявок</p>
              <p className="text-sm text-muted-foreground">Создайте первую заявку, нажав кнопку выше</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="cursor-pointer transition-colors hover:bg-accent">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                      <CardDescription>
                        Создана: {new Date(ticket.created_at).toLocaleString('ru-RU')}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
