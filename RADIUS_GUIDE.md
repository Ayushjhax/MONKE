# 🌍 Global Radius Search Guide

## Available Radius Options

Your geo-based discovery now supports **9 radius options** from local to global coverage!

---

## 📍 Radius Options Explained

### **Local & Nearby**

#### **25 km (Local)**
- **Coverage:** Your immediate city/town
- **Use Case:** Find deals in your local area
- **Example:** If in Manhattan, covers all of NYC

#### **50 km (Nearby)**
- **Coverage:** Your city + surrounding suburbs
- **Use Case:** Day trip destinations
- **Example:** From NYC, covers parts of New Jersey and Long Island

#### **100 km (Regional)** ⭐ *Default*
- **Coverage:** Metropolitan area + nearby cities
- **Use Case:** Weekend getaways
- **Example:** From NYC, covers Philadelphia area

#### **200 km (Wide Area)**
- **Coverage:** Multiple cities in your region
- **Use Case:** Regional travel
- **Example:** From NYC, reaches Boston and Washington DC

---

### **Extended & Continental**

#### **500 km (Extended)**
- **Coverage:** Multi-state region
- **Use Case:** Cross-state trips
- **Example:** From NYC, covers most of the East Coast

#### **1,000 km (Multi-State)**
- **Coverage:** Large multi-state area
- **Use Case:** Long-distance domestic travel
- **Example:** From NYC, reaches Florida and Chicago

#### **2,000 km (Continental)**
- **Coverage:** Half a continent
- **Use Case:** Cross-country travel
- **Example:** From NYC, covers most of USA east of Rockies

---

### **Global Coverage** 🌍

#### **5,000 km (Cross-Continental)**
- **Coverage:** Multiple continents
- **Use Case:** Intercontinental flights
- **Example:** From NYC, covers Europe, South America, and West Africa
- **Performance:** Returns up to 100 deals

#### **10,000 km (Global)** 🌍
- **Coverage:** Almost anywhere on Earth
- **Use Case:** See ALL available deals worldwide
- **Example:** From any location, see deals from around the world
- **Performance:** Returns up to 100 deals
- **Note:** Earth's circumference is ~40,000km, so 10,000km covers 1/4 of the globe in any direction

---

## 🚀 Performance Notes

### **Query Optimization by Radius**

| Radius | Query Limit | Results Shown | Performance |
|--------|-------------|---------------|-------------|
| 25-200 km | 200 deals | Top 50 | ⚡ Instant |
| 500-1000 km | 500 deals | Top 50 | ⚡ Fast |
| 2000-5000 km | 500 deals | Top 100 | 🔄 Quick |
| 10000 km | 500 deals | Top 100 | 🔄 Quick |

### **Why These Limits?**

- **Bounding box optimization** - Pre-filters deals efficiently
- **Distance calculation** - Only on filtered results
- **Sorted by proximity** - Closest deals shown first
- **Indexed queries** - Database indexes on lat/lng columns

---

## 💡 Use Case Examples

### **Tourist Planning** 🗺️
```
Scenario: Planning European vacation from NYC
- Share location in NYC
- Select: 5,000 km (Cross-Continental)
- Result: See flights to London, Paris, Rome, Barcelona
```

### **Digital Nomad** 💻
```
Scenario: Looking for cheap flights from current location
- Share location in Bali
- Select: 10,000 km (Global)
- Result: See deals to Asia, Australia, Middle East, Africa
```

### **Business Travel** 💼
```
Scenario: Find nearby conference cities
- Share location in San Francisco
- Select: 2,000 km (Continental)
- Result: See deals to Seattle, LA, Denver, Phoenix, Vancouver
```

### **Local Weekend** 🏖️
```
Scenario: Quick getaway from current city
- Share location in Miami
- Select: 200 km (Wide Area)
- Result: See deals to Keys, Fort Lauderdale, West Palm Beach
```

---

## 🌐 Distance Reference

### **Major City Pairs**

| From → To | Distance | Recommended Radius |
|-----------|----------|-------------------|
| NYC → Boston | 300 km | 500 km |
| NYC → Miami | 1,900 km | 2,000 km |
| NYC → Los Angeles | 4,500 km | 5,000 km |
| NYC → London | 5,500 km | 10,000 km |
| NYC → Tokyo | 11,000 km | 10,000 km |
| London → Paris | 450 km | 500 km |
| Singapore → Bangkok | 1,400 km | 2,000 km |
| Dubai → Mumbai | 2,000 km | 2,000 km |

### **Continental Coverage**

| Radius | Covers From NYC |
|--------|----------------|
| 1,000 km | NYC → Miami, Chicago, Toronto |
| 2,000 km | Most of Eastern USA + parts of Canada |
| 5,000 km | All of Americas, Europe, North Africa |
| 10,000 km | Everywhere except Antarctica |

---

## 🎯 Pro Tips

### **1. Start Local, Go Global**
```
1. Share location ✅
2. Start with 100 km (see what's nearby)
3. Gradually increase radius
4. Find sweet spot for your needs
```

### **2. Global Search Strategy**
```
For finding international deals:
- Use 10,000 km (Global) 🌍
- Filter by price
- Check event dates
- Look for cross-continental deals
```

### **3. Performance Tip**
```
Larger radius = More deals to check
- Be patient with 10,000 km searches
- Results still return in seconds
- Shows top 100 closest deals
```

### **4. Privacy Reminder**
```
Your location proof expires after 1 hour
- Automatic privacy protection
- Re-share location when needed
- Stored with blockchain signature
```

---

## 📊 What Gets Searched?

### **Search Area Calculation**

```typescript
// Bounding box optimization
latRange = radius / 111  // 1 degree ≈ 111 km
lngRange = radius / (111 * cos(latitude))

// Then filter by exact distance
deals.filter(deal => 
  haversineDistance(userLocation, dealOrigin) <= radius
)
```

### **Deals Included**

✅ **All deals with origin coordinates**
- Flight deals with origin airport
- Hotel deals near your location
- Sorted by distance (closest first)

❌ **Excluded from results**
- Deals without geo coordinates
- Expired deals
- Deals beyond your radius

---

## 🚀 Quick Examples

### **Find Everything Nearby (Default)**
```
Radius: 100 km (Regional)
Perfect for: Most users
Shows: Deals in your area
```

### **Planning International Trip**
```
Radius: 10,000 km (Global) 🌍
Perfect for: Finding best worldwide deals
Shows: Top 100 deals globally
```

### **Weekend Getaway**
```
Radius: 200 km (Wide Area)
Perfect for: Short trips
Shows: Nearby cities and attractions
```

---

## 🎊 Summary

**New Radius Options:**
- 📍 Local: 25-200 km (4 options)
- 🌎 Extended: 500-2,000 km (3 options)
- 🌍 Global: 5,000-10,000 km (2 options)

**Total: 9 radius options covering local to global!**

Now you can find travel deals anywhere on Earth! 🚀

