# ============================================================================
# Message Bus Infrastructure Package
# ============================================================================

"""
Message bus infrastructure package for event-driven architecture.
"""

from src.infrastructure.message_bus.bus import MessageBus, KafkaMessageBus, RabbitMQMessageBus, InMemoryMessageBus
from src.infrastructure.message_bus.producer import EventProducer
from src.infrastructure.message_bus.consumer import EventConsumer
from src.infrastructure.message_bus.message import Message, Event, Command, Query
from src.infrastructure.message_bus.handler import MessageHandler, EventHandler, CommandHandler, QueryHandler

__all__ = [
    "MessageBus",
    "KafkaMessageBus",
    "RabbitMQMessageBus",
    "InMemoryMessageBus",
    "EventProducer",
    "EventConsumer",
    "Message",
    "Event",
    "Command",
    "Query",
    "MessageHandler",
    "EventHandler",
    "CommandHandler",
    "QueryHandler",
]