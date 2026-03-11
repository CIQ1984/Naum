import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  currency: string;
  duration: string;
  isReturn?: boolean;
}

export interface Hotel {
  id: string;
  name: string;
  location: string;
  rating: number;
  pricePerNight: number;
  currency: string;
  amenities: string[];
  description: string;
  image: string;
}

export async function searchFlights(
  origin: string, 
  destination: string, 
  departureDate: string, 
  returnDate: string | null, 
  currency: string = 'USD'
): Promise<{ outbound: Flight[], inbound: Flight[] }> {
  const isRoundTrip = !!returnDate;
  
  const prompt = `Generate realistic flight options for a ${isRoundTrip ? 'round trip' : 'one-way'} journey.
  Outbound: ${origin} to ${destination} on ${departureDate}.
  ${isRoundTrip ? `Inbound: ${destination} to ${origin} on ${returnDate}.` : ''}
  Prices should be in ${currency}.
  Return the data as a JSON object with two arrays: "outbound" and "inbound" (empty if one-way).
  Each flight object should have: id, airline, flightNumber, origin, destination, departureTime, arrivalTime, price (number), currency, duration.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            outbound: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  airline: { type: Type.STRING },
                  flightNumber: { type: Type.STRING },
                  origin: { type: Type.STRING },
                  destination: { type: Type.STRING },
                  departureTime: { type: Type.STRING },
                  arrivalTime: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  currency: { type: Type.STRING },
                  duration: { type: Type.STRING },
                },
                required: ["id", "airline", "flightNumber", "origin", "destination", "departureTime", "arrivalTime", "price", "currency", "duration"]
              }
            },
            inbound: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  airline: { type: Type.STRING },
                  flightNumber: { type: Type.STRING },
                  origin: { type: Type.STRING },
                  destination: { type: Type.STRING },
                  departureTime: { type: Type.STRING },
                  arrivalTime: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  currency: { type: Type.STRING },
                  duration: { type: Type.STRING },
                },
                required: ["id", "airline", "flightNumber", "origin", "destination", "departureTime", "arrivalTime", "price", "currency", "duration"]
              }
            }
          },
          required: ["outbound", "inbound"]
        }
      }
    });

    const text = response.text;
    if (!text) return { outbound: [], inbound: [] };
    return JSON.parse(text);
  } catch (error) {
    console.error("Error searching flights:", error);
    return { outbound: [], inbound: [] };
  }
}

export interface DayPrice {
  date: string;
  price: number;
  currency: string;
}

export async function getFlightPriceCalendar(
  origin: string,
  destination: string,
  month: string, // YYYY-MM
  currency: string = 'USD'
): Promise<DayPrice[]> {
  const prompt = `Generate a daily flight price calendar for the route ${origin} to ${destination} for the month of ${month}.
  Prices should be in ${currency}.
  Provide a realistic price for each day of the month.
  Return the data as a JSON array of objects, each with: date (YYYY-MM-DD), price (number), currency.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              price: { type: Type.NUMBER },
              currency: { type: Type.STRING },
            },
            required: ["date", "price", "currency"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error fetching price calendar:", error);
    return [];
  }
}

export async function searchHotels(
  location: string,
  checkIn: string,
  checkOut: string,
  currency: string = 'USD'
): Promise<Hotel[]> {
  const prompt = `Generate 5 realistic hotel options in ${location} for the period from ${checkIn} to ${checkOut}.
  Prices should be in ${currency} per night.
  Include hotel name, location, rating (1-5), price per night, currency, amenities, a brief description, and a placeholder image URL from Unsplash.
  Return the data as a JSON array of objects.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              location: { type: Type.STRING },
              rating: { type: Type.NUMBER },
              pricePerNight: { type: Type.NUMBER },
              currency: { type: Type.STRING },
              amenities: { type: Type.ARRAY, items: { type: Type.STRING } },
              description: { type: Type.STRING },
              image: { type: Type.STRING },
            },
            required: ["id", "name", "location", "rating", "pricePerNight", "currency", "amenities", "description", "image"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error searching hotels:", error);
    return [];
  }
}
