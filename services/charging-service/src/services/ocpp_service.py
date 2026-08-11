# ============================================================================
# OCPP Service - Open Charge Point Protocol Implementation
# ============================================================================

# parking-management-system/services/charging-service/src/services/ocpp_service.py

import asyncio
import json
import websockets
from typing import Dict, Optional, Any, Callable
from datetime import datetime
from uuid import UUID, uuid4

from src.core.logging import get_logger
from src.core.config import settings
from src.domain.models import ChargingStation, ChargingSession
from src.domain.enums import (
    ChargingStatus,
    ConnectorType,
    ChargingProfile,
    OCPPMessageType,
)

logger = get_logger(__name__)

class OCPPService:
    """OCPP (Open Charge Point Protocol) service"""
    
    def __init__(self):
        self.websocket_server = None
        self.connections: Dict[str, websockets.WebSocketServerProtocol] = {}
        self.stations: Dict[str, ChargingStation] = {}
        self.sessions: Dict[str, ChargingSession] = {}
        self.message_handlers: Dict[str, Callable] = {}
        self._is_running = False
        self._heartbeat_task = None
    
    async def initialize(self) -> None:
        """Initialize OCPP service"""
        if not settings.OCPP_ENABLED:
            logger.info("OCPP is disabled")
            return
        
        # Register message handlers
        self._register_handlers()
        
        # Start websocket server
        self.websocket_server = await websockets.serve(
            self._handle_connection,
            settings.OCPP_HOST,
            settings.OCPP_PORT,
            ping_interval=30,
            ping_timeout=10,
        )
        
        self._is_running = True
        logger.info(f"OCPP server started on port {settings.OCPP_PORT}")
        
        # Start heartbeat monitoring
        self._heartbeat_task = asyncio.create_task(self._monitor_heartbeats())
    
    def _register_handlers(self) -> None:
        """Register OCPP message handlers"""
        self.message_handlers = {
            OCPPMessageType.BOOT_NOTIFICATION: self._handle_boot_notification,
            OCPPMessageType.HEARTBEAT: self._handle_heartbeat,
            OCPPMessageType.START_TRANSACTION: self._handle_start_transaction,
            OCPPMessageType.STOP_TRANSACTION: self._handle_stop_transaction,
            OCPPMessageType.STATUS_NOTIFICATION: self._handle_status_notification,
            OCPPMessageType.METER_VALUES: self._handle_meter_values,
            OCPPMessageType.RESERVE_NOW: self._handle_reserve_now,
            OCPPMessageType.CANCEL_RESERVATION: self._handle_cancel_reservation,
        }
    
    async def _handle_connection(
        self,
        websocket: websockets.WebSocketServerProtocol,
        path: str,
    ) -> None:
        """Handle incoming websocket connection"""
        try:
            # Extract station ID from path
            station_id = path.strip('/')
            
            # Store connection
            self.connections[station_id] = websocket
            logger.info(f"OCPP connection established: {station_id}")
            
            # Send response
            await self._send_response(websocket, "CONNECTED", {"status": "success"})
            
            # Handle messages
            async for message in websocket:
                await self._process_message(station_id, message)
            
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"OCPP connection closed: {station_id}")
        except Exception as e:
            logger.error(f"OCPP connection error: {str(e)}")
        finally:
            if station_id in self.connections:
                del self.connections[station_id]
    
    async def _process_message(
        self,
        station_id: str,
        message: str,
    ) -> None:
        """Process incoming OCPP message"""
        try:
            data = json.loads(message)
            message_type = data.get("message_type")
            
            if message_type in self.message_handlers:
                handler = self.message_handlers[message_type]
                await handler(station_id, data)
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON message: {str(e)}")
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
    
    async def _send_response(
        self,
        websocket: websockets.WebSocketServerProtocol,
        message_type: str,
        payload: Dict[str, Any],
    ) -> None:
        """Send response to charging station"""
        try:
            message = json.dumps({
                "message_type": message_type,
                "payload": payload,
                "timestamp": datetime.utcnow().isoformat(),
            })
            await websocket.send(message)
        except Exception as e:
            logger.error(f"Error sending response: {str(e)}")
    
    async def _handle_boot_notification(
        self,
        station_id: str,
        data: Dict[str, Any],
    ) -> None:
        """Handle boot notification"""
        logger.info(f"Boot notification from station: {station_id}")
        
        # Update station status
        if station_id in self.stations:
            self.stations[station_id].status = "available"
        
        # Send response
        websocket = self.connections.get(station_id)
        if websocket:
            await self._send_response(
                websocket,
                "BOOT_NOTIFICATION_RESPONSE",
                {
                    "status": "accepted",
                    "current_time": datetime.utcnow().isoformat(),
                    "interval": settings.OCPP_HEARTBEAT_INTERVAL,
                },
            )
    
    async def _handle_heartbeat(
        self,
        station_id: str,
        data: Dict[str, Any],
    ) -> None:
        """Handle heartbeat"""
        logger.debug(f"Heartbeat from station: {station_id}")
        
        # Update last heartbeat time
        if station_id in self.stations:
            self.stations[station_id].last_heartbeat = datetime.utcnow()
        
        # Send response
        websocket = self.connections.get(station_id)
        if websocket:
            await self._send_response(
                websocket,
                "HEARTBEAT_RESPONSE",
                {
                    "current_time": datetime.utcnow().isoformat(),
                },
            )
    
    async def _handle_start_transaction(
        self,
        station_id: str,
        data: Dict[str, Any],
    ) -> None:
        """Handle start transaction"""
        logger.info(f"Start transaction on station: {station_id}")
        
        connector_id = data.get("connector_id")
        id_tag = data.get("id_tag")
        meter_start = data.get("meter_start", 0)
        
        # Create charging session
        session = ChargingSession(
            id=uuid4(),
            station_id=station_id,
            connector_id=connector_id,
            id_tag=id_tag,
            meter_start=meter_start,
            start_time=datetime.utcnow(),
            status=ChargingStatus.STARTED,
        )
        
        self.sessions[session.id] = session
        
        # Send response
        websocket = self.connections.get(station_id)
        if websocket:
            await self._send_response(
                websocket,
                "START_TRANSACTION_RESPONSE",
                {
                    "transaction_id": str(session.id),
                    "status": "accepted",
                },
            )
    
    async def _handle_stop_transaction(
        self,
        station_id: str,
        data: Dict[str, Any],
    ) -> None:
        """Handle stop transaction"""
        logger.info(f"Stop transaction on station: {station_id}")
        
        transaction_id = data.get("transaction_id")
        meter_stop = data.get("meter_stop", 0)
        timestamp = datetime.utcnow()
        
        # Update session
        if transaction_id in self.sessions:
            session = self.sessions[transaction_id]
            session.meter_stop = meter_stop
            session.stop_time = timestamp
            session.status = ChargingStatus.COMPLETED
            session.duration = (timestamp - session.start_time).total_seconds()
            
            # Calculate energy consumption
            session.energy_consumed = session.meter_stop - session.meter_start
            
            # Calculate cost
            session.cost = await self._calculate_cost(session)
        
        # Send response
        websocket = self.connections.get(station_id)
        if websocket:
            await self._send_response(
                websocket,
                "STOP_TRANSACTION_RESPONSE",
                {
                    "status": "accepted",
                },
            )
    
    async def _handle_status_notification(
        self,
        station_id: str,
        data: Dict[str, Any],
    ) -> None:
        """Handle status notification"""
        logger.debug(f"Status notification from station: {station_id}")
        
        connector_id = data.get("connector_id")
        status = data.get("status")
        error_code = data.get("error_code")
        
        # Update station status
        if station_id in self.stations:
            station = self.stations[station_id]
            if connector_id and connector_id in station.connectors:
                station.connectors[connector_id].status = status
                station.connectors[connector_id].error_code = error_code
        
        # Send response
        websocket = self.connections.get(station_id)
        if websocket:
            await self._send_response(
                websocket,
                "STATUS_NOTIFICATION_RESPONSE",
                {"status": "accepted"},
            )
    
    async def _handle_meter_values(
        self,
        station_id: str,
        data: Dict[str, Any],
    ) -> None:
        """Handle meter values"""
        logger.debug(f"Meter values from station: {station_id}")
        
        transaction_id = data.get("transaction_id")
        meter_value = data.get("meter_value")
        
        # Update session
        if transaction_id in self.sessions:
            session = self.sessions[transaction_id]
            session.current_meter_value = meter_value
            session.last_meter_update = datetime.utcnow()
        
        # Send response
        websocket = self.connections.get(station_id)
        if websocket:
            await self._send_response(
                websocket,
                "METER_VALUES_RESPONSE",
                {"status": "accepted"},
            )
    
    async def _handle_reserve_now(
        self,
        station_id: str,
        data: Dict[str, Any],
    ) -> None:
        """Handle reserve now request"""
        logger.info(f"Reservation request for station: {station_id}")
        
        connector_id = data.get("connector_id")
        expiry_time = data.get("expiry_time")
        id_tag = data.get("id_tag")
        
        # Validate reservation
        if station_id in self.stations:
            station = self.stations[station_id]
            if connector_id in station.connectors:
                connector = station.connectors[connector_id]
                if connector.status == "available":
                    connector.status = "reserved"
                    connector.reserved_by = id_tag
                    connector.reserved_until = datetime.fromisoformat(expiry_time)
        
        # Send response
        websocket = self.connections.get(station_id)
        if websocket:
            await self._send_response(
                websocket,
                "RESERVE_NOW_RESPONSE",
                {"status": "accepted"},
            )
    
    async def _handle_cancel_reservation(
        self,
        station_id: str,
        data: Dict[str, Any],
    ) -> None:
        """Handle cancel reservation request"""
        logger.info(f"Cancelling reservation for station: {station_id}")
        
        reservation_id = data.get("reservation_id")
        
        # Cancel reservation
        for station in self.stations.values():
            for connector in station.connectors.values():
                if connector.reservation_id == reservation_id:
                    connector.status = "available"
                    connector.reserved_by = None
                    connector.reserved_until = None
                    connector.reservation_id = None
        
        # Send response
        websocket = self.connections.get(station_id)
        if websocket:
            await self._send_response(
                websocket,
                "CANCEL_RESERVATION_RESPONSE",
                {"status": "accepted"},
            )
    
    async def _monitor_heartbeats(self) -> None:
        """Monitor station heartbeats"""
        while self._is_running:
            try:
                current_time = datetime.utcnow()
                timeout = settings.OCPP_HEARTBEAT_INTERVAL * 2
                
                for station_id, station in self.stations.items():
                    if station.last_heartbeat:
                        elapsed = (current_time - station.last_heartbeat).total_seconds()
                        if elapsed > timeout:
                            logger.warning(f"Station {station_id} heartbeat timeout")
                            station.status = "offline"
                
                await asyncio.sleep(settings.OCPP_HEARTBEAT_INTERVAL)
                
            except Exception as e:
                logger.error(f"Heartbeat monitoring error: {str(e)}")
    
    async def _calculate_cost(self, session: ChargingSession) -> float:
        """Calculate charging cost"""
        energy_cost = session.energy_consumed * settings.PRICE_PER_KWH
        time_cost = session.duration * settings.PRICE_PER_MINUTE
        return energy_cost + time_cost + settings.CONNECTION_FEE
    
    def is_connected(self) -> bool:
        """Check if OCPP service is running"""
        return self._is_running and len(self.connections) > 0
    
    async def shutdown(self) -> None:
        """Shutdown OCPP service"""
        self._is_running = False
        
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
        
        if self.websocket_server:
            self.websocket_server.close()
            await self.websocket_server.wait_closed()
        
        # Close all connections
        for station_id, websocket in self.connections.items():
            try:
                await websocket.close()
            except:
                pass
        
        logger.info("OCPP service shutdown complete")