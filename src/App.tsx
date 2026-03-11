/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plane, 
  Search, 
  Calendar, 
  User, 
  MapPin, 
  ArrowRight, 
  Clock, 
  CreditCard, 
  CheckCircle, 
  X, 
  LogOut,
  History,
  Menu,
  ChevronRight,
  Building,
  Phone,
  Mail,
  Smartphone,
  Sun,
  Moon,
  ShieldCheck,
  PenTool,
  Monitor,
  Compass,
  Heart,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { searchFlights, searchHotels, getFlightPriceCalendar, Flight, Hotel, DayPrice } from './services/flightService';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' }) => {
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
    secondary: 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm',
    outline: 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50',
    ghost: 'text-zinc-600 hover:bg-zinc-100'
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    if (props.onClick) props.onClick(e);
  };

  return (
    <button 
      className={cn(
        'px-4 py-2 rounded-xl font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2',
        variants[variant],
        className
      )}
      {...props}
      onClick={handleClick}
    >
      {children}
    </button>
  );
};

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-zinc-200 rounded-xl", className)} />
);

const BottomNav = ({ activeTab, onTabChange }: { activeTab: string, onTabChange: (tab: string) => void }) => {
  const tabs = [
    { id: 'search', label: 'Busca', icon: Search },
    { id: 'explore', label: 'Explorar', icon: Compass },
    { id: 'favorites', label: 'Salvos', icon: Heart },
    { id: 'history', label: 'Viagens', icon: History },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-zinc-100 px-4 py-2 flex justify-between items-center md:hidden z-50 safe-area-bottom">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => {
              if ('vibrate' in navigator) navigator.vibrate(5);
              onTabChange(tab.id);
            }}
            className={cn(
              "flex flex-col items-center gap-1 p-2 transition-colors",
              isActive ? "text-emerald-600" : "text-zinc-400"
            )}
          >
            <Icon className={cn("w-6 h-6", isActive && "fill-emerald-600/10")} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) => (
  <div className={cn('bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden card', className)} {...props}>
    {children}
  </div>
);

const Input = ({ icon: Icon, label, ...props }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-muted">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />}
      <input 
        className={cn(
          "w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 pr-4 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 input-field",
          Icon ? "pl-10" : "pl-4"
        )}
        {...props}
      />
    </div>
  </div>
);

const PriceStrip = ({ prices, currency, onSelectDate, selectedDate }: any) => {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
      {prices.map((p: any) => {
        const date = new Date(p.date);
        const isSelected = selectedDate && isSameDay(date, selectedDate);
        return (
          <button
            key={p.date}
            onClick={() => onSelectDate(date)}
            className={cn(
              "flex-shrink-0 flex flex-col items-center justify-center min-w-[80px] p-3 rounded-2xl border transition-all",
              isSelected 
                ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200" 
                : "bg-white border-zinc-100 hover:border-emerald-200 text-zinc-900"
            )}
          >
            <span className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", isSelected ? "text-emerald-100" : "text-zinc-400")}>
              {format(date, 'EEE', { locale: undefined })}
            </span>
            <span className="text-lg font-black leading-none mb-1">{format(date, 'dd')}</span>
            <span className={cn("text-[10px] font-bold", isSelected ? "text-white" : "text-emerald-600")}>
              {currency === 'BRL' ? 'R$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'XOF' ? 'CFA' : '$'}
              {p.price}
            </span>
          </button>
        );
      })}
    </div>
  );
};

const PriceCalendarModal = ({ 
  isOpen, 
  onClose, 
  month, 
  onMonthChange, 
  prices, 
  loading, 
  currency,
  onSelectDate
}: any) => {
  const days = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month)
  });

  const getPriceForDay = (date: Date) => {
    return prices.find((p: any) => isSameDay(new Date(p.date), date));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-2xl w-full shadow-2xl modal-content max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold">Calendário de Preços</h3>
                <p className="text-zinc-500 text-sm">Explore os melhores preços para sua viagem</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-8 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
              <button 
                onClick={() => onMonthChange(subMonths(month, 1))}
                className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-xl shadow-sm transition-all"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <h4 className="text-lg font-bold capitalize">
                {format(month, 'MMMM yyyy')}
              </h4>
              <button 
                onClick={() => onMonthChange(addMonths(month, 1))}
                className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-xl shadow-sm transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-zinc-500 font-medium">Buscando melhores tarifas...</p>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                    {d}
                  </div>
                ))}
                {Array.from({ length: startOfMonth(month).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {days.map(day => {
                  const dayPrice = getPriceForDay(day);
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => {
                        onSelectDate(day);
                        onClose();
                      }}
                      className={cn(
                        "aspect-square p-2 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 group",
                        isToday(day) ? "border-emerald-500 bg-emerald-50/30" : "border-zinc-100 dark:border-zinc-800 hover:border-emerald-200 hover:bg-emerald-50/10",
                        !dayPrice && "opacity-50"
                      )}
                    >
                      <span className="text-sm font-bold">{format(day, 'd')}</span>
                      {dayPrice && (
                        <span className="text-[10px] font-black text-emerald-600">
                          {currency === 'BRL' ? 'R$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'XOF' ? 'CFA' : '$'}
                          {dayPrice.price}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-8 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
              <p className="text-xs text-emerald-800 dark:text-emerald-400 leading-relaxed">
                * Os preços exibidos são estimativas baseadas em pesquisas recentes e podem variar no momento da reserva final.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'search' | 'results' | 'bookings'>('search');
  const [activeTab, setActiveTab] = useState<'flights' | 'hotels'>('flights');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(pre-hooks/color-scheme: dark)').matches);
    }
    return false;
  });
  
  // Search State (Flights)
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState<Date | null>(new Date());
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  const [currency, setCurrency] = useState('BRL');
  const [searching, setSearching] = useState(false);
  const [flights, setFlights] = useState<{ outbound: Flight[], inbound: Flight[] }>({ outbound: [], inbound: [] });
  
  // Search State (Hotels)
  const [hotelLocation, setHotelLocation] = useState('');
  const [hotelCheckIn, setHotelCheckIn] = useState<Date | null>(new Date());
  const [hotelCheckOut, setHotelCheckOut] = useState<Date | null>(null);
  const [hotelGuests, setHotelGuests] = useState(1);
  const [hotelRooms, setHotelRooms] = useState(1);
  const [hotels, setHotels] = useState<Hotel[]>([]);

  // Selection State
  const [selectedOutbound, setSelectedOutbound] = useState<Flight | null>(null);
  const [selectedInbound, setSelectedInbound] = useState<Flight | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'visa' | 'orange' | 'telecel'>('visa');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signature, setSignature] = useState('');
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [myHotelBookings, setMyHotelBookings] = useState<any[]>([]);
  const [priceCalendar, setPriceCalendar] = useState<DayPrice[]>([]);
  const [showPriceCalendar, setShowPriceCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showLoginChoiceModal, setShowLoginChoiceModal] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [paymentType, setPaymentType] = useState<'total' | 'reservation'>('total');

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: serverTimestamp()
          });
        }

        // Flight Bookings
        const qFlights = query(collection(db, 'bookings'), where('userId', '==', user.uid));
        const unsubFlights = onSnapshot(qFlights, (snapshot) => {
          const bookingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), bookingType: 'flight' }));
          setMyBookings(bookingsData);
        });

        // Hotel Bookings
        const qHotels = query(collection(db, 'hotelBookings'), where('userId', '==', user.uid));
        const unsubHotels = onSnapshot(qHotels, (snapshot) => {
          const hotelBookingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), bookingType: 'hotel' }));
          setMyHotelBookings(hotelBookingsData);
        });

        return () => {
          unsubFlights();
          unsubHotels();
        };
      }
    });
    return () => unsubscribe();
  }, []);

  const combinedBookings = [...myBookings, ...myHotelBookings].sort((a: any, b: any) => {
    const timeA = a.createdAt?.seconds || 0;
    const timeB = b.createdAt?.seconds || 0;
    return timeB - timeA;
  });

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const handlePrint = (booking: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const content = `
      <html>
        <head>
          <title>Reserva QuiboteFamily - ${booking.id}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header { border-bottom: 2px solid #059669; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .logo { font-size: 28px; font-weight: 900; color: #059669; letter-spacing: -1px; }
            .title { font-size: 22px; margin-bottom: 10px; font-weight: bold; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 20px; }
            .section { margin-bottom: 25px; }
            .label { font-size: 11px; color: #888; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; margin-bottom: 4px; }
            .value { font-size: 16px; font-weight: 700; }
            .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center; }
            .status-badge { display: inline-block; padding: 6px 12px; background: #ecfdf5; color: #059669; border-radius: 8px; font-weight: 800; font-size: 12px; }
            .price-box { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">QuiboteFamily</div>
            <div class="status-badge">RESERVA CONFIRMADA</div>
          </div>
          
          <div class="section">
            <div class="title">Confirmação de Reserva #${booking.id.slice(-6).toUpperCase()}</div>
            <p>Este documento serve como comprovante oficial de sua reserva realizada através da QuiboteFamily.</p>
          </div>
          
          <div class="details">
            <div class="section">
              <div class="label">Passageiro / Hóspede</div>
              <div class="value">${booking.passengerName || 'Convidado'}</div>
              
              <div class="label" style="margin-top: 15px;">Tipo de Serviço</div>
              <div class="value">${booking.bookingType === 'flight' ? 'Passagem Aérea' : 'Hospedagem'}</div>

              <div class="label" style="margin-top: 15px;">Item</div>
              <div class="value">${booking.bookingType === 'flight' ? booking.airline : booking.hotelName}</div>
            </div>
            
            <div class="price-box">
              <div class="label">Valor Total</div>
              <div class="value" style="font-size: 24px; color: #059669;">${booking.currency} ${booking.price?.toLocaleString()}</div>
              
              <div class="label" style="margin-top: 15px;">Modalidade</div>
              <div class="value">${booking.paymentType === 'total' ? 'Pagamento Total Realizado' : 'Reserva Sem Pré-pagamento'}</div>
              
              <div class="label" style="margin-top: 15px;">Método</div>
              <div class="value">${booking.paymentMethod.toUpperCase()}</div>
            </div>
          </div>

          <div class="section" style="margin-top: 30px;">
            <div class="label">Itinerário / Datas</div>
            <div class="value">
              ${booking.bookingType === 'flight' 
                ? `${booking.origin} (${booking.departureTime}) → ${booking.destination} (${booking.arrivalTime})`
                : `Check-in: ${booking.checkIn} | Check-out: ${booking.checkOut}`
              }
            </div>
          </div>
          
          <div class="footer">
            <p>QuiboteFamily - Sua família em qualquer lugar do mundo.</p>
            <p>Emitido em: ${new Date().toLocaleString()}</p>
          </div>
          
          <script>
            window.onload = () => { 
              setTimeout(() => {
                window.print(); 
                // window.close(); 
              }, 500);
            };
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const fetchPriceCalendar = async (month: Date) => {
    if (!origin || !destination) return;
    setLoadingCalendar(true);
    const monthStr = format(month, 'yyyy-MM');
    const prices = await getFlightPriceCalendar(origin, destination, monthStr, currency);
    setPriceCalendar(prices);
    setLoadingCalendar(false);
  };

  useEffect(() => {
    if (origin && destination) {
      fetchPriceCalendar(calendarMonth);
    }
  }, [calendarMonth, origin, destination, currency]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setView('results');
    
    if (activeTab === 'flights') {
      if (!origin || !destination || !departureDate) return;
      setSelectedOutbound(null);
      setSelectedInbound(null);
      
      const results = await searchFlights(
        origin, 
        destination, 
        format(departureDate, 'yyyy-MM-dd'),
        tripType === 'round-trip' ? format(returnDate!, 'yyyy-MM-dd') : null,
        currency
      );
      setFlights(results);
    } else {
      if (!hotelLocation || !hotelCheckIn || !hotelCheckOut) return;
      setSelectedHotel(null);
      const results = await searchHotels(
        hotelLocation,
        format(hotelCheckIn, 'yyyy-MM-dd'),
        format(hotelCheckOut, 'yyyy-MM-dd'),
        currency
      );
      setHotels(results);
    }
    setSearching(false);
  };

  const handleBook = async () => {
    if (!user && !isGuestMode) {
      setShowLoginChoiceModal(true);
      return;
    }

    setShowPaymentModal(true);
  };

  const handlePaymentConfirm = () => {
    setShowPaymentModal(false);
    setShowSignatureModal(true);
  };

  const confirmBooking = async () => {
    if (!signature.trim()) return;
    setBookingInProgress(true);
    setShowSignatureModal(false);
    try {
      const passengerName = user?.displayName || guestName || 'Convidado';
      const userId = user?.uid || 'guest';

      if (activeTab === 'flights') {
        if (!selectedOutbound) return;
        const bookings = [];
        
        // Outbound
        bookings.push({
          userId,
          flightNumber: selectedOutbound.flightNumber,
          airline: selectedOutbound.airline,
          origin: selectedOutbound.origin,
          destination: selectedOutbound.destination,
          departureTime: selectedOutbound.departureTime,
          arrivalTime: selectedOutbound.arrivalTime,
          price: selectedOutbound.price,
          currency: selectedOutbound.currency,
          status: 'confirmed',
          passengerName,
          paymentMethod,
          paymentType,
          digitalSignature: signature,
          date: format(departureDate!, 'dd/MM/yyyy'),
          type: 'outbound',
          createdAt: serverTimestamp()
        });

        // Inbound
        if (tripType === 'round-trip' && selectedInbound) {
          bookings.push({
            userId,
            flightNumber: selectedInbound.flightNumber,
            airline: selectedInbound.airline,
            origin: selectedInbound.origin,
            destination: selectedInbound.destination,
            departureTime: selectedInbound.departureTime,
            arrivalTime: selectedInbound.arrivalTime,
            price: selectedInbound.price,
            currency: selectedInbound.currency,
            status: 'confirmed',
            passengerName,
            paymentMethod,
            paymentType,
            digitalSignature: signature,
            date: format(returnDate!, 'dd/MM/yyyy'),
            type: 'inbound',
            createdAt: serverTimestamp()
          });
        }

        for (const b of bookings) {
          await addDoc(collection(db, 'bookings'), b);
        }
        
        setSelectedOutbound(null);
        setSelectedInbound(null);
      } else {
        if (!selectedHotel) return;
        
        await addDoc(collection(db, 'hotelBookings'), {
          userId,
          hotelName: selectedHotel.name,
          location: selectedHotel.location,
          checkIn: format(hotelCheckIn!, 'yyyy-MM-dd'),
          checkOut: format(hotelCheckOut!, 'yyyy-MM-dd'),
          guests: hotelGuests,
          rooms: hotelRooms,
          price: selectedHotel.pricePerNight * hotelRooms,
          currency: selectedHotel.currency,
          status: 'confirmed',
          passengerName,
          paymentMethod,
          paymentType,
          digitalSignature: signature,
          date: format(hotelCheckIn!, 'dd/MM/yyyy'),
          createdAt: serverTimestamp()
        });
        
        setSelectedHotel(null);
      }
      
      setSignature('');
      setIsGuestMode(false);
      setGuestName('');
      setView('bookings');
    } catch (error) {
      console.error("Booking failed:", error);
    } finally {
      setBookingInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Plane className="w-12 h-12 text-emerald-600 animate-bounce" />
          <p className="text-zinc-500 font-medium animate-pulse">Iniciando QuiboteFamily...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-bottom border-zinc-100">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setView('search')}
          >
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
              <Plane className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">QuiboteFamily</span>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              onClick={() => setDarkMode(!darkMode)} 
              className="p-2"
              title={darkMode ? "Modo Claro" : "Modo Escuro"}
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-zinc-600" />}
            </Button>

            {user ? (
              <>
                <Button variant="ghost" onClick={() => setView('bookings')} className="hidden sm:flex">
                  <History className="w-4 h-4" />
                  Minhas Reservas
                </Button>
                <div className="h-8 w-[1px] bg-zinc-200 mx-2 hidden sm:block" />
                <div className="flex items-center gap-3 pl-2">
                  <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-zinc-200" />
                  <Button variant="outline" onClick={handleLogout} className="p-2 sm:px-4">
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sair</span>
                  </Button>
                </div>
              </>
            ) : (
              <Button onClick={handleLogin}>
                <User className="w-4 h-4" />
                Entrar
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <AnimatePresence mode="wait">
          {view === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="text-center space-y-4">
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-900">
                  Explore o Mundo <br />
                  <span className="text-emerald-600">Com a QuiboteFamily.</span>
                </h1>
                <p className="text-zinc-500 text-lg max-w-2xl mx-auto">
                  Reserve voos e hotéis para qualquer lugar do planeta com os melhores preços e suporte total.
                </p>
              </div>

              <div className="flex justify-center mb-[-24px] relative z-10">
                <div className="bg-white p-1.5 rounded-2xl shadow-lg border border-zinc-100 flex gap-1">
                  <button 
                    onClick={() => setActiveTab('flights')}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all",
                      activeTab === 'flights' ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" : "text-zinc-500 hover:bg-zinc-50"
                    )}
                  >
                    <Plane className="w-5 h-5" />
                    Voos
                  </button>
                  <button 
                    onClick={() => setActiveTab('hotels')}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all",
                      activeTab === 'hotels' ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" : "text-zinc-500 hover:bg-zinc-50"
                    )}
                  >
                    <Building className="w-5 h-5" />
                    Hotéis
                  </button>
                </div>
              </div>

              <Card className="p-6 sm:p-8 pt-12 bg-white shadow-xl shadow-emerald-900/5">
                <div className="flex flex-wrap gap-4 mb-6">
                  {activeTab === 'flights' && (
                    <div className="flex bg-zinc-100 p-1 rounded-xl">
                      <button 
                        onClick={() => setTripType('one-way')}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all",
                          tripType === 'one-way' ? "bg-white text-emerald-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                        )}
                      >
                        Só Ida
                      </button>
                      <button 
                        onClick={() => setTripType('round-trip')}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all",
                          tripType === 'round-trip' ? "bg-white text-emerald-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                        )}
                      >
                        Ida e Volta
                      </button>
                    </div>
                  )}

                  <select 
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="bg-zinc-100 px-4 py-1.5 rounded-xl text-sm font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="BRL">R$ (BRL)</option>
                    <option value="USD">$ (USD)</option>
                    <option value="EUR">€ (EUR)</option>
                    <option value="GBP">£ (GBP)</option>
                    <option value="XOF">CFA (Guiné-Bissau)</option>
                  </select>
                </div>

                {activeTab === 'flights' ? (
                  <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Input 
                      label="Origem" 
                      icon={MapPin} 
                      placeholder="De onde você sai?" 
                      value={origin}
                      onChange={(e: any) => setOrigin(e.target.value)}
                      required
                    />
                    <Input 
                      label="Destino" 
                      icon={MapPin} 
                      placeholder="Para onde você vai?" 
                      value={destination}
                      onChange={(e: any) => setDestination(e.target.value)}
                      required
                    />
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        {tripType === 'round-trip' ? 'Ida (Partida)' : 'Data (Partida)'}
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 z-10" />
                        <DatePicker
                          selected={departureDate}
                          onChange={(d) => setDepartureDate(d)}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 pl-10 pr-4 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 input-field"
                          placeholderText="Selecione a data"
                          minDate={new Date()}
                          required
                        />
                      </div>
                    </div>

                    {tripType === 'round-trip' ? (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Volta (Retorno)</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 z-10" />
                          <DatePicker
                            selected={returnDate}
                            onChange={(d) => setReturnDate(d)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 pl-10 pr-4 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 input-field"
                            placeholderText="Data de volta"
                            minDate={departureDate || new Date()}
                            required
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-end gap-4">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => {
                            if (!origin || !destination) {
                              alert("Por favor, preencha origem e destino primeiro.");
                              return;
                            }
                            setShowPriceCalendar(true);
                          }}
                          className="h-[46px] px-6"
                        >
                          <Calendar className="w-5 h-5" />
                        </Button>
                        <Button type="submit" className="w-full h-[46px] text-lg">
                          <Search className="w-5 h-5" />
                          Buscar Voos
                        </Button>
                      </div>
                    )}

                    {tripType === 'round-trip' && (
                      <div className="md:col-span-4 flex justify-end gap-4">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => {
                            if (!origin || !destination) {
                              alert("Por favor, preencha origem e destino primeiro.");
                              return;
                            }
                            setShowPriceCalendar(true);
                          }}
                          className="w-full md:w-auto px-8 h-[46px]"
                        >
                          <Calendar className="w-5 h-5" />
                          Calendário de Preços
                        </Button>
                        <Button type="submit" className="w-full md:w-auto px-12 h-[46px] text-lg">
                          <Search className="w-5 h-5" />
                          Buscar Voos
                        </Button>
                      </div>
                    )}
                  </form>
                ) : (
                  <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Input 
                      label="Localização" 
                      icon={MapPin} 
                      placeholder="Onde você quer ficar?" 
                      value={hotelLocation}
                      onChange={(e: any) => setHotelLocation(e.target.value)}
                      required
                    />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Check-in (Entrada)</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 z-10" />
                        <DatePicker
                          selected={hotelCheckIn}
                          onChange={(d) => setHotelCheckIn(d)}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 pl-10 pr-4 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 input-field"
                          placeholderText="Data de entrada"
                          minDate={new Date()}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Check-out (Saída)</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 z-10" />
                        <DatePicker
                          selected={hotelCheckOut}
                          onChange={(d) => setHotelCheckOut(d)}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 pl-10 pr-4 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-zinc-900 input-field"
                          placeholderText="Data de saída"
                          minDate={hotelCheckIn || new Date()}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" className="w-full h-[46px] text-lg">
                        <Search className="w-5 h-5" />
                        Buscar Hotéis
                      </Button>
                    </div>
                  </form>
                )}
              </Card>

              {activeTab === 'flights' && origin && destination && priceCalendar.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Melhores Preços Próximos
                    </h3>
                    <Button variant="ghost" onClick={() => setShowPriceCalendar(true)} className="text-xs h-8">
                      Ver Calendário Completo
                    </Button>
                  </div>
                  <PriceStrip 
                    prices={priceCalendar.slice(0, 14)} 
                    currency={currency} 
                    onSelectDate={setDepartureDate}
                    selectedDate={departureDate}
                  />
                </div>
              )}

              {/* Featured Destinations */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { name: 'Tóquio', country: 'Japão', img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80' },
                  { name: 'Paris', country: 'França', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80' },
                  { name: 'Nova York', country: 'EUA', img: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80' },
                ].map((dest) => (
                  <div key={dest.name} className="group relative h-64 rounded-2xl overflow-hidden cursor-pointer">
                    <img 
                      src={dest.img} 
                      alt={dest.name} 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-4 left-4 text-white">
                      <p className="text-xs font-medium text-white/70 uppercase tracking-widest">{dest.country}</p>
                      <h3 className="text-2xl font-bold">{dest.name}</h3>
                    </div>
                  </div>
                ))}
              </div>

              {/* App Download Section */}
              <Card className="p-8 bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      <Smartphone className="w-4 h-4" />
                      App Mobile & Desktop
                    </div>
                    <h2 className="text-4xl font-black leading-tight">
                      Leve a QuiboteFamily <br /> no seu bolso.
                    </h2>
                    <p className="text-emerald-50 text-lg leading-relaxed">
                      Instale nosso aplicativo no seu iPhone, Android ou Windows e tenha acesso rápido às melhores ofertas de viagens, onde quer que você esteja.
                    </p>
                    
                    <div className="flex flex-wrap gap-4">
                      {deferredPrompt ? (
                        <Button 
                          onClick={handleInstall}
                          className="bg-white text-emerald-700 hover:bg-emerald-50 px-8 h-14 text-lg font-bold shadow-xl"
                        >
                          Instalar Agora
                        </Button>
                      ) : (
                        <div className="flex flex-wrap gap-4">
                          <div className="flex items-center gap-3 bg-black/20 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                              <Monitor className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-white/60">Disponível para</p>
                              <p className="font-bold">Windows & Mac</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 bg-black/20 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                              <Smartphone className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-white/60">Disponível para</p>
                              <p className="font-bold">iOS & Android</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 flex items-center gap-4 text-sm text-emerald-100 italic">
                      <div className="flex -space-x-2">
                        {[1,2,3].map(i => (
                          <img key={i} src={`https://i.pravatar.cc/100?u=${i}`} className="w-8 h-8 rounded-full border-2 border-emerald-600" />
                        ))}
                      </div>
                      <span>+50.000 usuários já instalaram</span>
                    </div>
                  </div>

                  <div className="relative hidden md:block">
                    <div className="absolute -inset-4 bg-white/10 blur-3xl rounded-full" />
                    <img 
                      src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80" 
                      alt="App Preview"
                      className="relative rounded-3xl shadow-2xl border-4 border-white/20 rotate-3 hover:rotate-0 transition-transform duration-500"
                    />
                  </div>
                </div>
              </Card>

              {/* Install Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                    <Monitor className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="font-bold mb-2">No Windows/Mac</h4>
                  <p className="text-zinc-500 text-sm">Clique no ícone de instalação na barra de endereços do seu navegador Chrome ou Edge.</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
                  <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mb-4">
                    <Smartphone className="w-6 h-6 text-orange-600" />
                  </div>
                  <h4 className="font-bold mb-2">No iOS (iPhone)</h4>
                  <p className="text-zinc-500 text-sm">Toque no botão "Compartilhar" no Safari e selecione "Adicionar à Tela de Início".</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
                    <Smartphone className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h4 className="font-bold mb-2">No Android</h4>
                  <p className="text-zinc-500 text-sm">Toque nos três pontos do Chrome e selecione "Instalar Aplicativo".</p>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-900">Resultados da Busca</h2>
                  <p className="text-zinc-500">
                    {origin} <ArrowRight className="inline w-3 h-3" /> {destination} 
                    {tripType === 'round-trip' && ` (Ida e Volta)`}
                  </p>
                </div>
                <Button variant="outline" onClick={() => setView('search')}>
                  Alterar Busca
                </Button>
              </div>

              {searching ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <Card key={i} className="p-6">
                      <div className="flex justify-between items-center">
                        <div className="space-y-3 flex-1">
                          <Skeleton className="h-4 w-1/4" />
                          <div className="flex items-center gap-4">
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-1 w-12" />
                            <Skeleton className="h-8 w-16" />
                          </div>
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                        <div className="text-right space-y-2">
                          <Skeleton className="h-6 w-24 ml-auto" />
                          <Skeleton className="h-10 w-32 ml-auto" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {activeTab === 'flights' ? (
                    <>
                      {/* Outbound Flights */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          <Plane className="w-5 h-5 text-emerald-600" />
                          Voos de Ida {departureDate && <span className="text-sm font-normal text-zinc-400">• {format(departureDate, 'dd/MM/yyyy')}</span>}
                        </h3>
                        {flights.outbound.map((flight) => (
                          <Card 
                            key={flight.id} 
                            onClick={() => setSelectedOutbound(flight)}
                            className={cn(
                              "p-4 cursor-pointer transition-all border-2",
                              selectedOutbound?.id === flight.id ? "border-emerald-500 bg-emerald-50/30" : "border-transparent hover:border-zinc-200"
                            )}
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                                  <Plane className="w-4 h-4 text-zinc-500" />
                                </div>
                                <div>
                                  <p className="font-bold text-sm">{flight.airline}</p>
                                  <p className="text-[10px] text-zinc-400 font-mono">{flight.flightNumber}</p>
                                </div>
                              </div>
                              <p className="text-lg font-black text-emerald-600">
                                {flight.currency === 'BRL' ? 'R$' : flight.currency === 'EUR' ? '€' : flight.currency === 'GBP' ? '£' : flight.currency === 'XOF' ? 'CFA' : '$'} {flight.price}
                              </p>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-center">
                                <p className="font-bold">{flight.departureTime}</p>
                                <p className="text-[10px] text-zinc-400 uppercase">{flight.origin}</p>
                              </div>
                              <div className="flex-1 px-4 flex flex-col items-center gap-1">
                                <p className="text-[9px] text-zinc-400 uppercase">{flight.duration}</p>
                                <div className="w-full h-[1px] bg-zinc-200 relative">
                                  <Plane className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 text-emerald-500 rotate-90" />
                                </div>
                              </div>
                              <div className="text-center">
                                <p className="font-bold">{flight.arrivalTime}</p>
                                <p className="text-[10px] text-zinc-400 uppercase">{flight.destination}</p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>

                      {/* Inbound Flights */}
                      {tripType === 'round-trip' && (
                        <div className="space-y-4">
                          <h3 className="text-lg font-bold flex items-center gap-2">
                            <Plane className="w-5 h-5 text-emerald-600 rotate-180" />
                            Voos de Volta {returnDate && <span className="text-sm font-normal text-zinc-400">• {format(returnDate, 'dd/MM/yyyy')}</span>}
                          </h3>
                          {flights.inbound.map((flight) => (
                            <Card 
                              key={flight.id} 
                              onClick={() => setSelectedInbound(flight)}
                              className={cn(
                                "p-4 cursor-pointer transition-all border-2",
                                selectedInbound?.id === flight.id ? "border-emerald-500 bg-emerald-50/30" : "border-transparent hover:border-zinc-200"
                              )}
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                                    <Plane className="w-4 h-4 text-zinc-500" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm">{flight.airline}</p>
                                    <p className="text-[10px] text-zinc-400 font-mono">{flight.flightNumber}</p>
                                  </div>
                                </div>
                                <p className="text-lg font-black text-emerald-600">
                                  {flight.currency === 'BRL' ? 'R$' : flight.currency === 'EUR' ? '€' : flight.currency === 'GBP' ? '£' : flight.currency === 'XOF' ? 'CFA' : '$'} {flight.price}
                                </p>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="text-center">
                                  <p className="font-bold">{flight.departureTime}</p>
                                  <p className="text-[10px] text-zinc-400 uppercase">{flight.origin}</p>
                                </div>
                                <div className="flex-1 px-4 flex flex-col items-center gap-1">
                                  <p className="text-[9px] text-zinc-400 uppercase">{flight.duration}</p>
                                  <div className="w-full h-[1px] bg-zinc-200 relative">
                                    <Plane className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 text-emerald-500 rotate-90" />
                                  </div>
                                </div>
                                <div className="text-center">
                                  <p className="font-bold">{flight.arrivalTime}</p>
                                  <p className="text-[10px] text-zinc-400 uppercase">{flight.destination}</p>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {hotels.map((hotel) => (
                        <Card 
                          key={hotel.id} 
                          onClick={() => setSelectedHotel(hotel)}
                          className={cn(
                            "group cursor-pointer transition-all border-2",
                            selectedHotel?.id === hotel.id ? "border-emerald-500 bg-emerald-50/30" : "border-transparent hover:border-zinc-200"
                          )}
                        >
                          <div className="h-48 relative overflow-hidden">
                            <img 
                              src={hotel.image} 
                              alt={hotel.name} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg font-bold text-emerald-600 shadow-sm">
                              {hotel.currency === 'BRL' ? 'R$' : hotel.currency === 'EUR' ? '€' : hotel.currency === 'GBP' ? '£' : hotel.currency === 'XOF' ? 'CFA' : '$'} {hotel.pricePerNight}/noite
                            </div>
                          </div>
                          <div className="p-6 space-y-4">
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                {[...Array(5)].map((_, i) => (
                                  <div key={i} className={cn("w-3 h-3 rounded-full", i < hotel.rating ? "bg-amber-400" : "bg-zinc-200")} />
                                ))}
                              </div>
                              <h3 className="text-xl font-bold">{hotel.name}</h3>
                              <p className="text-sm text-zinc-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {hotel.location}
                              </p>
                              {hotelCheckIn && hotelCheckOut && (
                                <div className="mt-2 flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md w-fit">
                                  <Calendar className="w-3 h-3" />
                                  <span>{format(hotelCheckIn, 'dd/MM')} — {format(hotelCheckOut, 'dd/MM')}</span>
                                  <span className="text-emerald-400">•</span>
                                  <span>{Math.ceil((hotelCheckOut.getTime() - hotelCheckIn.getTime()) / (1000 * 60 * 60 * 24))} noites</span>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-zinc-600 line-clamp-2">{hotel.description}</p>
                            <div className="flex flex-wrap gap-2">
                              {hotel.amenities.slice(0, 3).map((amenity, i) => (
                                <span key={i} className="text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-500 px-2 py-1 rounded-md">
                                  {amenity}
                                </span>
                              ))}
                              {hotel.amenities.length > 3 && (
                                <span className="text-[10px] font-bold text-zinc-400 px-2 py-1">+{hotel.amenities.length - 3}</span>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Booking Summary Bar */}
              {(selectedOutbound || selectedInbound || selectedHotel) && (
                <motion.div 
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 p-4 shadow-2xl z-40"
                >
                  <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex gap-4">
                      {activeTab === 'flights' ? (
                        <>
                          {selectedOutbound && (
                            <div className="text-sm">
                              <p className="text-xs text-zinc-400 uppercase font-bold">Ida</p>
                              <p className="font-bold">{selectedOutbound.airline} • {selectedOutbound.flightNumber}</p>
                              <p className="text-[10px] text-zinc-500">{departureDate && format(departureDate, 'dd/MM/yyyy')}</p>
                            </div>
                          )}
                          {selectedInbound && (
                            <div className="text-sm">
                              <p className="text-xs text-zinc-400 uppercase font-bold">Volta</p>
                              <p className="font-bold">{selectedInbound.airline} • {selectedInbound.flightNumber}</p>
                              <p className="text-[10px] text-zinc-500">{returnDate && format(returnDate, 'dd/MM/yyyy')}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        selectedHotel && (
                          <div className="flex gap-4">
                            <div className="text-sm">
                              <p className="text-xs text-zinc-400 uppercase font-bold">Hotel</p>
                              <p className="font-bold">{selectedHotel.name}</p>
                              <p className="text-xs text-zinc-500">{hotelRooms} quarto(s) • {hotelGuests} hóspede(s)</p>
                            </div>
                            <div className="text-sm border-l border-zinc-200 pl-4 hidden sm:block">
                              <p className="text-xs text-zinc-400 uppercase font-bold">Check-in / Out</p>
                              <p className="font-bold text-xs">
                                {format(hotelCheckIn!, 'dd/MM')} — {format(hotelCheckOut!, 'dd/MM')}
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-zinc-400 uppercase font-bold">Total</p>
                        <p className="text-2xl font-black text-emerald-600">
                          {currency === 'BRL' ? 'R$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'XOF' ? 'CFA' : '$'} 
                          {activeTab === 'flights' 
                            ? (selectedOutbound?.price || 0) + (selectedInbound?.price || 0)
                            : (selectedHotel?.pricePerNight || 0) * hotelRooms
                          }
                        </p>
                      </div>
                      <Button 
                        onClick={handleBook} 
                        disabled={activeTab === 'flights' 
                          ? (tripType === 'round-trip' ? (!selectedOutbound || !selectedInbound) : !selectedOutbound)
                          : !selectedHotel
                        }
                        className="px-8 py-3 text-lg"
                      >
                        Reservar Agora
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {view === 'bookings' && (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-zinc-900">Minhas Reservas</h2>
                <Button variant="outline" onClick={() => setView('search')}>
                  Nova Busca
                </Button>
              </div>

              {combinedBookings.length > 0 ? (
                <div className="space-y-4">
                  {combinedBookings.map((booking) => (
                    <Card key={booking.id} className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                              {booking.bookingType === 'hotel' ? 'Hotel' : (booking.type === 'inbound' ? 'Volta' : 'Ida')} • Confirmado
                            </span>
                          </div>
                          <h3 className="text-xl font-bold">{booking.bookingType === 'hotel' ? booking.hotelName : booking.airline}</h3>
                          <p className="text-sm text-zinc-500">Reserva #{booking.id.slice(-6).toUpperCase()}</p>
                        </div>

                        {booking.bookingType === 'flight' ? (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-6">
                              <div className="text-center">
                                <p className="text-sm font-bold">{booking.origin}</p>
                                <p className="text-xs text-zinc-400">{booking.departureTime}</p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-zinc-300" />
                              <div className="text-center">
                                <p className="text-sm font-bold">{booking.destination}</p>
                                <p className="text-xs text-zinc-400">{booking.arrivalTime}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md w-fit">
                              <Calendar className="w-3 h-3" />
                              <span>{booking.date}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-xs text-zinc-400 uppercase font-bold">Check-in</p>
                              <p className="text-sm font-bold">{booking.checkIn}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-zinc-300" />
                            <div className="text-center">
                              <p className="text-xs text-zinc-400 uppercase font-bold">Check-out</p>
                              <p className="text-sm font-bold">{booking.checkOut}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                          <p className="text-lg font-bold text-zinc-900">
                            {booking.currency === 'BRL' ? 'R$' : booking.currency === 'EUR' ? '€' : booking.currency === 'GBP' ? '£' : booking.currency === 'XOF' ? 'CFA' : '$'} {booking.price}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <Calendar className="w-3 h-3" />
                            {booking.createdAt?.seconds ? format(new Date(booking.createdAt.seconds * 1000), 'dd/MM/yyyy') : 'Recent'}
                          </div>
                          {booking.paymentMethod && (
                            <div className="text-[10px] font-bold uppercase text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-100 input-field">
                              {booking.paymentMethod}
                            </div>
                          )}
                          {booking.digitalSignature && (
                            <div className="text-[10px] italic text-zinc-400 font-serif">
                              Assinado: {booking.digitalSignature}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 sm:flex-none gap-2"
                            onClick={() => handlePrint(booking)}
                          >
                            <Printer className="w-4 h-4" /> Imprimir
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto">
                    <History className="w-8 h-8 text-zinc-300" />
                  </div>
                  <h3 className="text-xl font-bold">Você ainda não tem reservas</h3>
                  <p className="text-zinc-500">Suas futuras viagens aparecerão aqui.</p>
                  <Button onClick={() => setView('search')}>Começar a Explorar</Button>
                </Card>
              )}
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black">Meu Perfil</h2>
                <Button variant="outline" onClick={() => setView('search')}>Voltar</Button>
              </div>

              <Card className="p-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <img 
                      src={user?.photoURL || `https://i.pravatar.cc/150?u=${user?.uid}`} 
                      className="w-32 h-32 rounded-full border-4 border-emerald-500/20 shadow-xl"
                    />
                    <div className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{user?.displayName || 'Viajante Quibote'}</h3>
                    <p className="text-zinc-500">{user?.email}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 w-full pt-8">
                    <div className="bg-zinc-50 p-4 rounded-2xl text-center">
                      <p className="text-2xl font-black text-emerald-600">{combinedBookings.length}</p>
                      <p className="text-xs font-bold text-zinc-400 uppercase">Reservas</p>
                    </div>
                    <div className="bg-zinc-50 p-4 rounded-2xl text-center">
                      <p className="text-2xl font-black text-emerald-600">Nível 1</p>
                      <p className="text-xs font-bold text-zinc-400 uppercase">Fidelidade</p>
                    </div>
                  </div>

                  <div className="w-full pt-8 space-y-3">
                    <Button variant="outline" className="w-full justify-start gap-4 h-14">
                      <CreditCard className="w-5 h-5" /> Métodos de Pagamento
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-4 h-14">
                      <ShieldCheck className="w-5 h-5" /> Segurança e Privacidade
                    </Button>
                    <Button onClick={handleLogout} variant="ghost" className="w-full justify-start gap-4 h-14 text-red-600 hover:bg-red-50 hover:text-red-700">
                      <LogOut className="w-5 h-5" /> Sair da Conta
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Booking Overlay */}
      <AnimatePresence>
        {bookingInProgress && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <Card className="max-w-md w-full p-8 text-center space-y-6">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 border-4 border-emerald-100 rounded-full" />
                <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin" />
                <Plane className="absolute inset-0 m-auto w-8 h-8 text-emerald-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Finalizando Reserva...</h3>
                <p className="text-zinc-500">Estamos processando seu pedido com a companhia aérea. Por favor, aguarde.</p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <Card className="max-w-md w-full p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">Pagamento</h3>
                <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-zinc-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Opção de Reserva</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setPaymentType('total')}
                      className={cn(
                        "p-3 rounded-xl border-2 text-sm font-bold transition-all",
                        paymentType === 'total' ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-100 text-zinc-500"
                      )}
                    >
                      Pagamento Total
                    </button>
                    <button 
                      onClick={() => setPaymentType('reservation')}
                      className={cn(
                        "p-3 rounded-xl border-2 text-sm font-bold transition-all",
                        paymentType === 'reservation' ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-100 text-zinc-500"
                      )}
                    >
                      Sem Pré-pagamento
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Forma de Pagamento</p>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => setPaymentMethod('visa')}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                        paymentMethod === 'visa' ? "border-emerald-500 bg-emerald-50" : "border-zinc-100 hover:border-zinc-200"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-6 h-6 text-blue-600" />
                        <span className="font-bold">Cartão Visa</span>
                      </div>
                      {paymentMethod === 'visa' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                    </button>

                    <button 
                      onClick={() => setPaymentMethod('orange')}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                        paymentMethod === 'orange' ? "border-emerald-500 bg-emerald-50" : "border-zinc-100 hover:border-zinc-200"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-6 h-6 text-orange-500" />
                        <span className="font-bold">Orange Money</span>
                      </div>
                      {paymentMethod === 'orange' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                    </button>

                    <button 
                      onClick={() => setPaymentMethod('telecel')}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                        paymentMethod === 'telecel' ? "border-emerald-500 bg-emerald-50" : "border-zinc-100 hover:border-zinc-200"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-6 h-6 text-red-600" />
                        <span className="font-bold">Telecel Mobile Money</span>
                      </div>
                      {paymentMethod === 'telecel' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={handlePaymentConfirm} className="w-full py-4 text-lg">
                  {paymentType === 'total' ? 'Pagar e Continuar' : 'Confirmar Reserva'}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPriceCalendar && (
          <PriceCalendarModal 
            isOpen={showPriceCalendar}
            onClose={() => setShowPriceCalendar(false)}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            prices={priceCalendar}
            loading={loadingCalendar}
            currency={currency}
            onSelectDate={(date: Date) => setDepartureDate(date)}
          />
        )}
      </AnimatePresence>

      {/* Signature Modal (2FA) */}
      <AnimatePresence>
        {showLoginChoiceModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <Card className="max-w-md w-full p-8 space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">Como deseja continuar?</h3>
                <p className="text-zinc-500">Entre com sua conta para salvar suas viagens ou continue como convidado.</p>
              </div>
              
              <div className="space-y-3">
                <Button onClick={() => { setShowLoginChoiceModal(false); handleLogin(); }} className="w-full h-14 gap-3 text-lg">
                  <User className="w-5 h-5" /> Entrar com Google
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => { setShowLoginChoiceModal(false); setIsGuestMode(true); }} 
                  className="w-full h-14 gap-3 text-lg"
                >
                  <Smartphone className="w-5 h-5" /> Continuar como Convidado
                </Button>
              </div>
              
              <button 
                onClick={() => setShowLoginChoiceModal(false)}
                className="w-full text-zinc-400 text-sm font-bold hover:text-zinc-600 transition-colors"
              >
                Cancelar
              </button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGuestMode && !guestName && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <Card className="max-w-md w-full p-8 space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">Identificação</h3>
                <p className="text-zinc-500">Por favor, informe seu nome completo para a reserva.</p>
              </div>
              
              <div className="space-y-4">
                <Input 
                  label="Nome Completo" 
                  placeholder="Ex: João Silva" 
                  value={guestName}
                  onChange={(e: any) => setGuestName(e.target.value)}
                />
                <Button 
                  disabled={!guestName.trim()} 
                  onClick={() => setShowPaymentModal(true)} 
                  className="w-full h-14 text-lg"
                >
                  Continuar para Pagamento
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {showSignatureModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl modal-content"
          >
            <div className="text-center space-y-4 mb-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold">Assinatura Digital</h3>
              <p className="text-zinc-500 text-muted">
                Como fator de segurança (2FA), por favor assine digitalmente digitando seu nome completo abaixo para confirmar a reserva.
              </p>
              
              <div className="bg-zinc-50 p-4 rounded-2xl text-left space-y-2 border border-zinc-100">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Resumo da Reserva</p>
                {activeTab === 'flights' ? (
                  <div className="space-y-1">
                    {selectedOutbound && (
                      <p className="text-sm font-bold flex justify-between items-center">
                        <span className="flex items-center gap-1"><Plane className="w-3 h-3 text-emerald-500" /> Ida</span>
                        <span className="text-zinc-500 font-normal text-xs">{departureDate && format(departureDate, 'dd/MM/yyyy')}</span>
                      </p>
                    )}
                    {selectedInbound && (
                      <p className="text-sm font-bold flex justify-between items-center">
                        <span className="flex items-center gap-1"><Plane className="w-3 h-3 text-emerald-500 rotate-180" /> Volta</span>
                        <span className="text-zinc-500 font-normal text-xs">{returnDate && format(returnDate, 'dd/MM/yyyy')}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  selectedHotel && (
                    <div className="space-y-1">
                      <p className="text-sm font-bold flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-500" /> {selectedHotel.name}
                      </p>
                      <p className="text-xs text-zinc-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(hotelCheckIn!, 'dd/MM/yyyy')} — {format(hotelCheckOut!, 'dd/MM/yyyy')}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 input-field">
                <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Assine aqui</label>
                <div className="relative">
                  <PenTool className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Seu Nome Completo"
                    className="w-full bg-transparent border-none focus:ring-0 text-xl font-serif italic"
                    autoFocus
                  />
                </div>
              </div>

              <Button 
                onClick={confirmBooking}
                disabled={!signature.trim() || bookingInProgress}
                className="w-full py-4 text-lg font-bold"
              >
                {bookingInProgress ? 'Processando...' : 'Confirmar e Assinar'}
              </Button>
              <Button variant="ghost" onClick={() => setShowSignatureModal(false)} className="w-full">
                Voltar
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      <footer className="max-w-5xl mx-auto px-4 py-12 border-t border-zinc-100 mt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Plane className="w-6 h-6 text-emerald-600" />
              <span className="text-xl font-bold tracking-tight">QuiboteFamily</span>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Sua agência de viagens de confiança na Guiné-Bissau e no mundo. 
              Voos, hotéis e suporte personalizado para sua família.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-zinc-900">Contato</h4>
            <div className="space-y-3 text-sm text-zinc-500">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>+245 955462514 / 969283728 / 966062665</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-600" />
                <span>naumquibote@gmail.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Bissau, Guiné-Bissau</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-zinc-900">Links Úteis</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-zinc-500">
              <a href="#" className="hover:text-emerald-600 transition-colors">Sobre Nós</a>
              <a href="#" className="hover:text-emerald-600 transition-colors">Suporte</a>
              <a href="#" className="hover:text-emerald-600 transition-colors">Termos</a>
              <a href="#" className="hover:text-emerald-600 transition-colors">Privacidade</a>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-zinc-100 gap-4">
          <p className="text-sm text-zinc-400">© 2026 QuiboteFamily. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 grayscale opacity-50">
              <CreditCard className="w-5 h-5" />
              <span className="text-[10px] font-bold">VISA</span>
            </div>
            <div className="flex items-center gap-1 grayscale opacity-50">
              <Smartphone className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase">Orange Money</span>
            </div>
            <div className="flex items-center gap-1 grayscale opacity-50">
              <Smartphone className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase">Mobile Money</span>
            </div>
          </div>
        </div>
      </footer>
      <BottomNav 
        activeTab={view === 'results' ? 'search' : (view === 'bookings' ? 'history' : view)} 
        onTabChange={(tab) => {
          if (tab === 'search') setView('search');
          else if (tab === 'history') setView('bookings');
          else if (tab === 'profile') setView('profile');
          // Other tabs can be added as needed
        }} 
      />
    </div>
  );
}
