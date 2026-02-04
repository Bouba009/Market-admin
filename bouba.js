// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getDatabase, ref, set, onValue, update, remove, push, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyACuXD3szL8eudcmU5QtPWRT9Ha8k782DA",
    authDomain: "gouba-80f4c.firebaseapp.com",
    projectId: "gouba-80f4c",
    storageBucket: "gouba-80f4c.appspot.com",
    messagingSenderId: "640752558914",
    appId: "1:640752558914:web:75951a854ee68f4b3b1edb",
    measurementId: "G-Y5T48PJ38Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);
const storage = getStorage(app);

// Global Variables
let currentUser = null;
let currentUserType = null;
let currentLanguage = 'ar';
let activeOrderId = null;
let locationWatchId = null;
let customerLocation = null;
let driverLocation = null;

// Translations
const translations = {
    ar: {
        'new-order': 'طلب جديد',
        'logout': 'خروج',
        'food-name-label': 'اسم الأكل:',
        'restaurant-name-label': 'اسم المحل:',
        'notes-label': 'ملاحظات إضافية:',
        'share-location': '📍 مشاركة الموقع وإرسال الطلب',
        'order-status': 'حالة الطلب',
        'invoice-title': 'فاتورة المنتجات',
        'driver-phone-label': 'رقم هاتف الموصل:',
        'delivery-success': 'تم التوصيل بنجاح!',
        'available-orders': 'الطلبات المتاحة',
        'active-order': 'الطلب النشط',
        'status-waiting': 'في انتظار موصل...',
        'status-going-restaurant': 'الموصل في طريقه إلى المحل 🏪',
        'status-at-restaurant': 'تم طلب احتياجكم من المحل 📦',
        'status-on-way': 'الموصل في الطريق إليك 🏍️',
        'customer': 'الزبون',
        'food': 'الطعام',
        'restaurant': 'المحل',
        'notes': 'ملاحظات',
        'phone': 'الهاتف',
        'accept-order': 'قبول الطلب',
        'new-order-notification': 'طلب جديد! 🔔'
    },
    fr: {
        'new-order': 'Nouvelle commande',
        'logout': 'Déconnexion',
        'food-name-label': 'Nom du plat:',
        'restaurant-name-label': 'Nom du restaurant:',
        'notes-label': 'Notes supplémentaires:',
        'share-location': '📍 Partager la localisation et envoyer',
        'order-status': 'État de la commande',
        'invoice-title': 'Facture des produits',
        'driver-phone-label': 'Téléphone du livreur:',
        'delivery-success': 'Livraison réussie!',
        'available-orders': 'Commandes disponibles',
        'active-order': 'Commande active',
        'status-waiting': 'En attente d\'un livreur...',
        'status-going-restaurant': 'Le livreur se rend au restaurant 🏪',
        'status-at-restaurant': 'Commande récupérée au restaurant 📦',
        'status-on-way': 'Le livreur est en route vers vous 🏍️',
        'customer': 'Client',
        'food': 'Plat',
        'restaurant': 'Restaurant',
        'notes': 'Notes',
        'phone': 'Téléphone',
        'accept-order': 'Accepter la commande',
        'new-order-notification': 'Nouvelle commande! 🔔'
    }
};

// Language Switching
window.switchLanguage = function(lang) {
    currentLanguage = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`${lang}-btn`).classList.add('active');
    
    // Update all translatable elements
    document.querySelectorAll('[data-ar]').forEach(el => {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = el.getAttribute(`data-${lang}-placeholder`);
        } else {
            el.textContent = el.getAttribute(`data-${lang}`);
        }
    });
};

// Auth Tab Switching
let selectedUserType = 'customer';
window.showAuthTab = function(type) {
    selectedUserType = type;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
};

// Login
window.login = function() {
    const username = document.getElementById('username').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    if (!username || !phone) {
        alert(currentLanguage === 'ar' ? 'الرجاء إدخال جميع البيانات' : 'Veuillez remplir tous les champs');
        return;
    }
    
    currentUser = {
        id: Date.now().toString(),
        name: username,
        phone: phone,
        type: selectedUserType
    };
    
    currentUserType = selectedUserType;
    
    // Save user to Firebase
    set(ref(database, `users/${currentUser.id}`), currentUser);
    
    // Hide auth screen and show appropriate screen
    document.getElementById('auth-screen').classList.remove('active');
    if (selectedUserType === 'customer') {
        document.getElementById('customer-screen').classList.add('active');
    } else {
        document.getElementById('driver-screen').classList.add('active');
        startWatchingOrders();
        startTrackingDriverLocation();
    }
};

// Logout
window.logout = function() {
    if (locationWatchId) {
        navigator.geolocation.clearWatch(locationWatchId);
    }
    
    currentUser = null;
    currentUserType = null;
    activeOrderId = null;
    
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById('auth-screen').classList.add('active');
    
    // Clear forms
    document.getElementById('username').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('food-name').value = '';
    document.getElementById('restaurant-name').value = '';
    document.getElementById('notes').value = '';
};

// Share Location and Create Order
window.shareLocation = function() {
    const foodName = document.getElementById('food-name').value.trim();
    const restaurantName = document.getElementById('restaurant-name').value.trim();
    const notes = document.getElementById('notes').value.trim();
    
    if (!foodName || !restaurantName) {
        alert(currentLanguage === 'ar' ? 'الرجاء إدخال اسم الطعام والمحل' : 'Veuillez entrer le nom du plat et du restaurant');
        return;
    }
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                customerLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                createOrder(foodName, restaurantName, notes, customerLocation);
            },
            (error) => {
                alert(currentLanguage === 'ar' ? 'لم نتمكن من الوصول إلى موقعك' : 'Impossible d\'accéder à votre localisation');
                console.error(error);
            }
        );
    } else {
        alert(currentLanguage === 'ar' ? 'المتصفح لا يدعم تحديد الموقع' : 'Le navigateur ne supporte pas la géolocalisation');
    }
};

// Create Order
function createOrder(foodName, restaurantName, notes, location) {
    const ordersRef = ref(database, 'orders');
    const newOrderRef = push(ordersRef);
    
    const order = {
        id: newOrderRef.key,
        customerId: currentUser.id,
        customerName: currentUser.name,
        customerPhone: currentUser.phone,
        foodName: foodName,
        restaurantName: restaurantName,
        notes: notes,
        location: location,
        price: 100,
        status: 'pending',
        createdAt: Date.now()
    };
    
    set(newOrderRef, order).then(() => {
        activeOrderId = order.id;
        
        // Clear form
        document.getElementById('food-name').value = '';
        document.getElementById('restaurant-name').value = '';
        document.getElementById('notes').value = '';
        
        // Show status container
        document.getElementById('customer-status').style.display = 'block';
        updateCustomerStatus('waiting');
        
        // Start watching order updates
        watchOrderUpdates(order.id);
        
        // Start tracking customer location
        startTrackingCustomerLocation();
    });
}

// Watch Order Updates
function watchOrderUpdates(orderId) {
    const orderRef = ref(database, `orders/${orderId}`);
    onValue(orderRef, (snapshot) => {
        const order = snapshot.val();
        if (!order) return;
        
        if (currentUserType === 'customer') {
            updateCustomerUI(order);
        }
    });
}

// Update Customer UI
function updateCustomerUI(order) {
    if (order.status === 'accepted') {
        updateCustomerStatus('going-restaurant');
        
        // Show driver info
        document.getElementById('driver-info').style.display = 'block';
        document.getElementById('driver-phone').textContent = order.driverPhone;
        
        // Show map with driver location
        if (order.driverLocation) {
            updateCustomerMap(order.driverLocation);
        }
    } else if (order.status === 'at-restaurant') {
        updateCustomerStatus('at-restaurant');
    } else if (order.status === 'on-the-way') {
        updateCustomerStatus('on-way');
        
        // Show invoice if available
        if (order.invoiceUrl) {
            document.getElementById('invoice-container').style.display = 'block';
            document.getElementById('invoice-image').src = order.invoiceUrl;
        }
    } else if (order.status === 'completed') {
        showDeliverySuccess();
    }
    
    // Update driver location on map
    if (order.driverLocation) {
        updateCustomerMap(order.driverLocation);
        checkDeliveryProximity(order);
    }
}

// Update Customer Status Text
function updateCustomerStatus(status) {
    const statusText = document.getElementById('status-text');
    const messages = {
        'waiting': translations[currentLanguage]['status-waiting'],
        'going-restaurant': translations[currentLanguage]['status-going-restaurant'],
        'at-restaurant': translations[currentLanguage]['status-at-restaurant'],
        'on-way': translations[currentLanguage]['status-on-way']
    };
    statusText.textContent = messages[status] || '';
}

// Update Customer Map
function updateCustomerMap(driverLocation) {
    const mapElement = document.getElementById('customer-map');
    mapElement.innerHTML = `
        <div class="map-marker customer-marker" style="top: 45%; left: 45%;">👤</div>
        <div class="map-marker driver-marker" style="top: ${driverLocation.lat % 50}%; left: ${driverLocation.lng % 50}%;">🏍️</div>
    `;
}

// Start Tracking Customer Location
function startTrackingCustomerLocation() {
    if (navigator.geolocation) {
        locationWatchId = navigator.geolocation.watchPosition(
            (position) => {
                customerLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                if (activeOrderId) {
                    update(ref(database, `orders/${activeOrderId}`), {
                        customerCurrentLocation: customerLocation
                    });
                }
            },
            (error) => console.error(error),
            { enableHighAccuracy: true, maximumAge: 5000 }
        );
    }
}

// Driver Functions

// Start Watching Orders
function startWatchingOrders() {
    const ordersRef = ref(database, 'orders');
    onValue(ordersRef, (snapshot) => {
        const orders = snapshot.val();
        displayAvailableOrders(orders);
    });
}

// Display Available Orders
function displayAvailableOrders(orders) {
    const container = document.getElementById('available-orders');
    container.innerHTML = '';
    
    if (!orders) {
        container.innerHTML = `<p style="text-align: center; color: #666; padding: 40px;">
            ${currentLanguage === 'ar' ? 'لا توجد طلبات متاحة حالياً' : 'Aucune commande disponible'}
        </p>`;
        return;
    }
    
    let hasAvailableOrders = false;
    
    for (let orderId in orders) {
        const order = orders[orderId];
        
        // Only show pending orders
        if (order.status === 'pending') {
            hasAvailableOrders = true;
            
            const orderCard = document.createElement('div');
            orderCard.className = 'order-card';
            orderCard.innerHTML = `
                <h4>${order.foodName}</h4>
                <p><strong>${translations[currentLanguage]['restaurant']}:</strong> ${order.restaurantName}</p>
                <p><strong>${translations[currentLanguage]['customer']}:</strong> ${order.customerName}</p>
                ${order.notes ? `<p><strong>${translations[currentLanguage]['notes']}:</strong> ${order.notes}</p>` : ''}
                <div class="order-price">${order.price} دج</div>
                <button class="accept-btn" onclick="acceptOrder('${orderId}')">
                    ${translations[currentLanguage]['accept-order']}
                </button>
            `;
            container.appendChild(orderCard);
            
            // Play notification sound
            playNotificationSound();
        }
    }
    
    if (!hasAvailableOrders) {
        container.innerHTML = `<p style="text-align: center; color: #666; padding: 40px;">
            ${currentLanguage === 'ar' ? 'لا توجد طلبات متاحة حالياً' : 'Aucune commande disponible'}
        </p>`;
    }
}

// Play Notification Sound
function playNotificationSound() {
    const sound = document.getElementById('notification-sound');
    sound.play().catch(e => console.log('Could not play sound:', e));
}

// Accept Order
window.acceptOrder = function(orderId) {
    activeOrderId = orderId;
    
    const orderRef = ref(database, `orders/${orderId}`);
    get(orderRef).then((snapshot) => {
        const order = snapshot.val();
        
        // Update order with driver info
        update(orderRef, {
            status: 'accepted',
            driverId: currentUser.id,
            driverName: currentUser.name,
            driverPhone: currentUser.phone,
            acceptedAt: Date.now()
        }).then(() => {
            // Hide available orders
            document.getElementById('available-orders').style.display = 'none';
            
            // Show active order
            displayActiveOrder(order);
            
            // Start tracking driver location
            startTrackingDriverLocation();
        });
    });
};

// Display Active Order
function displayActiveOrder(order) {
    const container = document.getElementById('active-order');
    container.style.display = 'block';
    
    document.getElementById('order-details').innerHTML = `
        <p><strong>${translations[currentLanguage]['food']}:</strong> ${order.foodName}</p>
        <p><strong>${translations[currentLanguage]['restaurant']}:</strong> ${order.restaurantName}</p>
        <p><strong>${translations[currentLanguage]['customer']}:</strong> ${order.customerName}</p>
        <p><strong>${translations[currentLanguage]['phone']}:</strong> ${order.customerPhone}</p>
        ${order.notes ? `<p><strong>${translations[currentLanguage]['notes']}:</strong> ${order.notes}</p>` : ''}
        <div class="order-price">${order.price} دج</div>
    `;
    
    // Show customer location on map
    updateDriverMap(order.location);
    
    // Watch for customer location updates
    watchCustomerLocation(order.id);
}

// Update Driver Map
function updateDriverMap(customerLocation) {
    const mapElement = document.getElementById('driver-map');
    mapElement.innerHTML = `
        <div class="map-marker customer-marker" style="top: ${customerLocation.lat % 50}%; left: ${customerLocation.lng % 50}%;">👤</div>
        <div class="map-marker driver-marker" style="top: 45%; left: 45%;">🏍️</div>
    `;
}

// Watch Customer Location
function watchCustomerLocation(orderId) {
    const orderRef = ref(database, `orders/${orderId}`);
    onValue(orderRef, (snapshot) => {
        const order = snapshot.val();
        if (order && order.customerCurrentLocation) {
            updateDriverMap(order.customerCurrentLocation);
        }
    });
}

// Start Tracking Driver Location
function startTrackingDriverLocation() {
    if (navigator.geolocation) {
        locationWatchId = navigator.geolocation.watchPosition(
            (position) => {
                driverLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                if (activeOrderId) {
                    update(ref(database, `orders/${activeOrderId}`), {
                        driverLocation: driverLocation
                    });
                }
            },
            (error) => console.error(error),
            { enableHighAccuracy: true, maximumAge: 5000 }
        );
    }
}

// Update Status
window.updateStatus = function(status) {
    if (!activeOrderId) return;
    
    const statusMap = {
        'going-to-restaurant': 'accepted',
        'at-restaurant': 'at-restaurant',
        'on-the-way': 'on-the-way'
    };
    
    update(ref(database, `orders/${activeOrderId}`), {
        status: statusMap[status]
    });
};

// Upload Invoice
window.uploadInvoice = function() {
    document.getElementById('invoice-upload').click();
};

// Handle Invoice Upload
window.handleInvoiceUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const storageReference = storageRef(storage, `invoices/${activeOrderId}_${Date.now()}`);
    
    uploadBytes(storageReference, file).then((snapshot) => {
        getDownloadURL(snapshot.ref).then((downloadURL) => {
            update(ref(database, `orders/${activeOrderId}`), {
                invoiceUrl: downloadURL
            });
            
            alert(currentLanguage === 'ar' ? 'تم رفع الفاتورة بنجاح' : 'Facture téléchargée avec succès');
        });
    });
};

// Complete Delivery
window.completeDelivery = function() {
    if (!activeOrderId) return;
    
    update(ref(database, `orders/${activeOrderId}`), {
        status: 'completed',
        completedAt: Date.now()
    }).then(() => {
        alert(currentLanguage === 'ar' ? 'تم إكمال التوصيل بنجاح!' : 'Livraison terminée avec succès!');
        
        // Reset driver screen
        document.getElementById('active-order').style.display = 'none';
        document.getElementById('available-orders').style.display = 'block';
        activeOrderId = null;
        
        if (locationWatchId) {
            navigator.geolocation.clearWatch(locationWatchId);
            locationWatchId = null;
        }
    });
};

// Check Delivery Proximity
function checkDeliveryProximity(order) {
    if (!order.driverLocation || !order.customerCurrentLocation) return;
    
    const distance = calculateDistance(
        order.driverLocation.lat,
        order.driverLocation.lng,
        order.customerCurrentLocation.lat,
        order.customerCurrentLocation.lng
    );
    
    // If within 50 meters
    if (distance < 0.05) {
        if (order.status !== 'completed') {
            update(ref(database, `orders/${order.id}`), {
                status: 'completed',
                completedAt: Date.now()
            });
        }
    }
}

// Calculate Distance (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Show Delivery Success
function showDeliverySuccess() {
    document.getElementById('success-message').style.display = 'block';
    
    // Hide after 5 seconds and reset
    setTimeout(() => {
        document.getElementById('customer-status').style.display = 'none';
        document.getElementById('success-message').style.display = 'none';
        activeOrderId = null;
        
        if (locationWatchId) {
            navigator.geolocation.clearWatch(locationWatchId);
            locationWatchId = null;
        }
    }, 5000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    switchLanguage('ar');
});
