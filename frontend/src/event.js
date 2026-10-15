// Event facts used across the pages.
export const ADDRESS_LINES = ['801–806, Rajhans Skylar,', 'Udhna Magdalla Road, Vesu,', 'Surat, Gujarat 395007']

export const MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=Rajhans+Skylar%2C+Udhna+Magdalla+Road%2C+Vesu%2C+Surat+395007'

// 5:00–8:00 PM IST on 20 October 2026
export const CALENDAR_URL =
  'https://calendar.google.com/calendar/render?' +
  new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Niveshaay office opening',
    dates: '20261020T113000Z/20261020T143000Z',
    details: 'Join Niveshaay for an evening of conversation as we open our new office.',
    location: '801–806, Rajhans Skylar, Udhna Magdalla Road, Vesu, Surat, Gujarat 395007',
  }).toString()

export const PARTY_OPTIONS = [
  [1, 'Myself'],
  [2, 'Me + 1'],
  [3, 'Me + 2'],
  [4, 'Me + 3'],
  [5, 'Me + 4'],
]
