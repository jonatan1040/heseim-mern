require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Client } = require('@googlemaps/google-maps-services-js');

const app = express();
const port = process.env.PORT || 5000;

// Default CORS options for local development
const corsOptionsLocal = {
  origin: 'http://localhost:3000', // Assuming your frontend runs on localhost:3000
  credentials: true, // Enable CORS credentials (cookies, authorization headers, etc.)
};

// CORS options for live server (production)
const corsOptionsProd = {
  origin: 'https://heseim-3e4f10e0607c.herokuapp.com',
  credentials: true,
};

// Select CORS options based on environment
const corsOptions =
  process.env.NODE_ENV === 'production' ? corsOptionsProd : corsOptionsLocal;

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Set up your Google Maps API key
const apiKey = process.env.API_KEY;
const client = new Client({});

app.post('/calculateRoute', async (req, res) => {
  const { startAddress, stopAddresses, endAddress, departureTime } = req.body;
  // const departureTime = new Date(departureTime2);
  console.log('startAddress', startAddress);
  console.log('stopAddresses', stopAddresses);
  console.log('endAddress', endAddress);
  console.log('departureTime', departureTime);
  // let waypointOrder = null;
  // let data_res = null;
  try {
    const data_res = await getOptimizedRoute(
      startAddress,
      stopAddresses,
      endAddress,
      departureTime
    );
    // .then((data) => {
    //   console.log(data.routes[0].waypoint_order);
    //   waypointOrder = data.routes[0].waypoint_order;
    //   data_res = data;
    // })
    // .catch((error) => {
    //   console.error('Error:', error.message);
    // });
    const waypointOrder = data_res.routes[0].waypoint_order;
    console.log('waypointOrder', waypointOrder);
    // console.log('data_res', data_res);
    // console.log('departureTime', departureTime);
    // console.log('startAddress', startAddress);
    // console.log('stopAddresses', stopAddresses);
    // console.log('endAddress', endAddress);

    // Create the ordered list of addresses
    const orderedAddresses = [
      startAddress,
      ...waypointOrder
        // .filter(
        //   (index1, i) => index1 !== 0 && index1 !== waypointOrder.length - 1
        // )
        .map((value, index) => {
          console.log('index:', index);
          console.log('value:', value);
          console.log('stopAddresses[index]:', stopAddresses[value]);
          console.log('stopAddresses:', stopAddresses);
          return stopAddresses[value];
        }),
      endAddress,
    ];

    console.log('orderedAddresses2:', orderedAddresses);
    console.log('data_res:', data_res.routes[0]);
    const directionsResult = data_res;
    console.log('orderedAddresses server:', orderedAddresses);
    console.log('directionsResult server:', directionsResult);
    res.json({ orderedAddresses, directionsResult });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function to get coordinates from an address
async function getCoordinates(address) {
  try {
    const response = await client.geocode({
      params: {
        address: address,
        language: 'he',
        key: apiKey,
      },
    });
    if (response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    } else {
      return null;
    }
  } catch (error) {
    throw new Error('Error fetching coordinates: ' + error.message);
  }
}

async function getCoordinatesForAddresses(addresses) {
  const coordinates = [];
  for (const address of addresses) {
    const coordinate = await getCoordinates(address);
    coordinates.push(coordinate);
  }
  return coordinates;
}

async function getOptimizedRoute(
  startAddress,
  stopAddresses,
  endAddress,
  departureTime
) {
  try {
    const coordinates = await getCoordinatesForAddresses([
      startAddress,
      ...stopAddresses,
      endAddress,
    ]);
    const origin = coordinates[0];
    const destination = coordinates[coordinates.length - 1];
    const waypoints = coordinates
      .slice(1, coordinates.length - 1)
      .map((coord) => ({ lat: coord.lat, lng: coord.lng }));
    const response = await client.directions({
      params: {
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        optimize: true,
        language: 'he',
        mode: 'driving',
        departure_time: departureTime,
        key: apiKey,
        routingPreference: 'TRAFFIC_AWARE',
      },
      timeout: 1000, // milliseconds
    });
    return response.data;
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Failed to get optimized route');
  }
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Step 1:
app.use(express.static(path.resolve(__dirname, 'build')));
// Step 2:
app.get('*', function (request, response) {
  response.sendFile(path.resolve(__dirname, 'build', 'index.html'));
});
