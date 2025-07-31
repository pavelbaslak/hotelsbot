console.log("✅ Webhook Triggered");
console.log("📦 Parsing payload:", JSON.stringify(event.payload, null, 2));

// Broneeringu ID
const reservationId = event.payload.reservation_id;
if (!reservationId) {
  workflow.debug = "❌ no reservation ID";
  return;
}

// Päring WuBooki API-le
const response = await fetch('https://kapi.wubook.net/kp/reservations/retrieve', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: 'wb_51e1c740-3b92-11eb-8a4b-001a4a5c09cf',
    id: reservationId
  })
});

const data = await response.json();
if (!data || !data.success || !data.data) {
  workflow.debug = "❌ API could not receive Reservation";
  return;
}

const resData = data.data;
const rooms = resData.rooms || [];
workflow.checkinDate = rooms[0]?.dfrom || '';
workflow.reservation_id = reservationId;

// Lisa külalise nimi ja telefon event.payloadist
workflow.name = event.payload.guest_name || 'No name';
workflow.phone = event.payload.phone || '';

console.log("✅ Print data:", {
  name: workflow.name,
  phone: workflow.phone,
  checkinDate: workflow.checkinDate
});
