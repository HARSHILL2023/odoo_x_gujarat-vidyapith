export const statsData = [
    { label: 'Active Vehicles', value: '42', icon: 'Truck', color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Available Drivers', value: '18', icon: 'Users', color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Vehicles In Maintenance', value: '5', icon: 'Wrench', color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'Total Trips', value: '1,284', icon: 'Navigation', color: 'text-purple-600', bg: 'bg-purple-100' },
];

export const vehiclesData = [
    { id: 1, name: 'Toyota Hilux', plate: 'GJ 01 AB 1234', capacity: '1.2 Tons', status: 'Available' },
    { id: 2, name: 'Tata Ace', plate: 'GJ 05 XY 5678', capacity: '0.7 Tons', status: 'On Trip' },
    { id: 3, name: 'Mahindra Bolero', plate: 'GJ 18 PK 9012', capacity: '1.5 Tons', status: 'In Shop' },
    { id: 4, name: 'Eicher Pro', plate: 'GJ 03 MZ 3456', capacity: '5.0 Tons', status: 'Available' },
    { id: 5, name: 'Ashok Leyland', plate: 'GJ 27 QW 7890', capacity: '10.0 Tons', status: 'On Trip' },
];

export const driversData = [
    { id: 1, name: 'Rajesh Kumar', license: 'DL-1234567890', status: 'Active' },
    { id: 2, name: 'Suresh Patel', license: 'DL-0987654321', status: 'On Leave' },
    { id: 3, name: 'Amit Singh', license: 'DL-5647382910', status: 'Active' },
    { id: 4, name: 'Vijay Sharma', license: 'DL-1122334455', status: 'Active' },
];

export const tripsData = [
    { id: 'TRP-001', vehicle: 'Toyota Hilux', driver: 'Rajesh Kumar', status: 'In Progress' },
    { id: 'TRP-002', vehicle: 'Tata Ace', driver: 'Amit Singh', status: 'Completed' },
    { id: 'TRP-003', vehicle: 'Mahindra Bolero', driver: 'Vijay Sharma', status: 'Delayed' },
    { id: 'TRP-004', vehicle: 'Eicher Pro', driver: 'Suresh Patel', status: 'Scheduled' },
];
