console.log('✅ Webhook Triggered')
console.log('📦 Parsing payload:', JSON.stringify(event.payload, null, 2))

// Broneeringu ID
const reservationId = event.payload.body?.reservation_id
if (!reservationId) {
  workflow.debug = '❌ no reservation ID'
  return
}


workflow.reservation_id = reservationId
workflow.name = event.payload.body?.guest_name || 'No name'
workflow.phone = event.payload.body?.phone || ''
workflow.checkinDate = event.payload.body?.checkin_date || ''

console.log('✅ Print data:', {
  name: workflow.name,
  phone: workflow.phone,
  checkinDate: workflow.checkinDate
})
