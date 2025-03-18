#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}NFTGen Server Restart Utility${NC}\n"

# Check if port 5175 is in use
echo -e "${YELLOW}Checking if port 5175 is already in use...${NC}"
if netstat -tuln | grep -q ":5175 "; then
  echo -e "${YELLOW}Port 5175 is already in use. Attempting to kill the process...${NC}"
  PID=$(lsof -t -i:5175)
  if [ -n "$PID" ]; then
    echo -e "Killing process $PID..."
    kill -9 $PID
    echo -e "${GREEN}Process killed.${NC}"
  else
    echo -e "${YELLOW}Could not find process using port 5175.${NC}"
  fi
else
  echo -e "${GREEN}Port 5175 is available.${NC}"
fi

# Check firewall status
echo -e "\n${YELLOW}Checking firewall status...${NC}"
if command -v ufw &> /dev/null; then
  if sudo ufw status | grep -q "Status: active"; then
    echo -e "Firewall is active. Checking if port 5175 is allowed..."
    if ! sudo ufw status | grep -q "5175/tcp"; then
      echo -e "${YELLOW}Port 5175 is not explicitly allowed. Adding rule...${NC}"
      sudo ufw allow 5175/tcp
      echo -e "${GREEN}Firewall rule added for port 5175.${NC}"
    else
      echo -e "${GREEN}Port 5175 is already allowed through firewall.${NC}"
    fi
  else
    echo -e "${GREEN}Firewall is inactive. No action needed.${NC}"
  fi
else
  echo -e "${YELLOW}UFW not found. Skipping firewall check.${NC}"
fi

# Restart the server with explicit host and port
echo -e "\n${YELLOW}Starting NFTGen server with explicit host and port settings...${NC}"
echo -e "${GREEN}npm run dev -- --host 0.0.0.0 --port 5175${NC}\n"

# Kill any existing npm processes for this project
pkill -f "vite.*5175" || true

# Start the server
npm run dev -- --host 0.0.0.0 --port 5175

# Note: The script will hang here while the server is running
# Press Ctrl+C to stop the server 