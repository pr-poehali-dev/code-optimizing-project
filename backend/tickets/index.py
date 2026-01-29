import json
import os
import psycopg2
from datetime import datetime

def handler(event: dict, context) -> dict:
    """
    Управление заявками: создание, получение списка, обновление статуса
    """
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Authorization',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        user_id = get_user_id_from_token(event)
        
        if method == 'GET':
            return get_tickets(event, user_id)
        elif method == 'POST':
            return create_ticket(event, user_id)
        elif method == 'PUT':
            return update_ticket(event, user_id)
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Method not allowed'}),
                'isBase64Encoded': False
            }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }

def get_db_connection():
    """Создание подключения к базе данных"""
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_user_id_from_token(event: dict) -> int:
    """Извлечение ID пользователя из токена (упрощенная версия)"""
    return 1

def get_tickets(event: dict, user_id: int) -> dict:
    """Получение списка заявок"""
    query_params = event.get('queryStringParameters') or {}
    ticket_id = query_params.get('id')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if ticket_id:
            cur.execute("""
                SELECT t.id, t.subject, t.description, t.status, t.priority, 
                       t.created_at, t.updated_at, u.full_name as creator_name
                FROM tickets t
                JOIN users u ON t.user_id = u.id
                WHERE t.id = %s
            """, (ticket_id,))
            ticket = cur.fetchone()
            
            if not ticket:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Ticket not found'}),
                    'isBase64Encoded': False
                }
            
            cur.execute("""
                SELECT tm.id, tm.message, tm.created_at, u.full_name, u.role
                FROM ticket_messages tm
                JOIN users u ON tm.user_id = u.id
                WHERE tm.ticket_id = %s AND tm.is_internal = false
                ORDER BY tm.created_at ASC
            """, (ticket_id,))
            messages = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'ticket': {
                        'id': ticket[0],
                        'subject': ticket[1],
                        'description': ticket[2],
                        'status': ticket[3],
                        'priority': ticket[4],
                        'created_at': ticket[5].isoformat() if ticket[5] else None,
                        'updated_at': ticket[6].isoformat() if ticket[6] else None,
                        'creator_name': ticket[7]
                    },
                    'messages': [{
                        'id': m[0],
                        'message': m[1],
                        'created_at': m[2].isoformat() if m[2] else None,
                        'user_name': m[3],
                        'user_role': m[4]
                    } for m in messages]
                }),
                'isBase64Encoded': False
            }
        else:
            cur.execute("""
                SELECT t.id, t.subject, t.status, t.priority, t.created_at, u.full_name
                FROM tickets t
                JOIN users u ON t.user_id = u.id
                WHERE t.user_id = %s
                ORDER BY t.created_at DESC
            """, (user_id,))
            tickets = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'tickets': [{
                        'id': t[0],
                        'subject': t[1],
                        'status': t[2],
                        'priority': t[3],
                        'created_at': t[4].isoformat() if t[4] else None,
                        'creator_name': t[5]
                    } for t in tickets]
                }),
                'isBase64Encoded': False
            }
    finally:
        cur.close()
        conn.close()

def create_ticket(event: dict, user_id: int) -> dict:
    """Создание новой заявки"""
    body = json.loads(event.get('body', '{}'))
    subject = body.get('subject')
    description = body.get('description')
    priority = body.get('priority', 'medium')
    
    if not subject or not description:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Subject and description are required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            INSERT INTO tickets (user_id, subject, description, priority)
            VALUES (%s, %s, %s, %s)
            RETURNING id, subject, description, status, priority, created_at
        """, (user_id, subject, description, priority))
        
        ticket = cur.fetchone()
        conn.commit()
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'ticket': {
                    'id': ticket[0],
                    'subject': ticket[1],
                    'description': ticket[2],
                    'status': ticket[3],
                    'priority': ticket[4],
                    'created_at': ticket[5].isoformat() if ticket[5] else None
                }
            }),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()

def update_ticket(event: dict, user_id: int) -> dict:
    """Обновление статуса заявки"""
    body = json.loads(event.get('body', '{}'))
    ticket_id = body.get('ticket_id')
    status = body.get('status')
    message = body.get('message')
    
    if not ticket_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Ticket ID is required'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if status:
            cur.execute(
                "UPDATE tickets SET status = %s WHERE id = %s",
                (status, ticket_id)
            )
        
        if message:
            cur.execute("""
                INSERT INTO ticket_messages (ticket_id, user_id, message)
                VALUES (%s, %s, %s)
            """, (ticket_id, user_id, message))
        
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True, 'message': 'Ticket updated'}),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()
