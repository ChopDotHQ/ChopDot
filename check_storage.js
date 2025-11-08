// Quick script to check if there's any data in localStorage
console.log('Checking localStorage...');
const pots = localStorage.getItem('chopdot_pots');
const settlements = localStorage.getItem('chopdot_settlements');
console.log('Pots:', pots ? JSON.parse(pots).length + ' pots found' : 'None');
console.log('Settlements:', settlements ? JSON.parse(settlements).length + ' settlements found' : 'None');
