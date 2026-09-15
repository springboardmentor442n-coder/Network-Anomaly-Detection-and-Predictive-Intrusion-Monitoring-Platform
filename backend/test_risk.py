import urllib.request
import json

features = [
    80,1000,10,5,500,300,100,20,50,10,
    100,20,50,10,800,15,50,20,100,10,
    500,50,20,100,10,300,50,20,100,10,
    0,0,40,40,10,5,20,100,50,10,
    100,0,1,0,1,1,0,0,0,0.5,
    60,50,40,40,10,500,300,200,100,1000,
    500,5,20,10,5,20,10,100,20,200,10
]

data = json.dumps({"features": features}).encode()

request = urllib.request.Request(
    "http://127.0.0.1:5000/predict-attack",
    data=data,
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    response = urllib.request.urlopen(request)
    print(response.read().decode())
except Exception as e:
    print("ERROR:", e)