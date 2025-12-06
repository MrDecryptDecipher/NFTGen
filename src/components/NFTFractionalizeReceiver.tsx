import React, { useState } from 'react';
import { PlusIcon, MinusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { GlassCard } from './GlassCard';
import { toast } from 'react-toastify';

interface ReceiverAddress {
  address: string;
  amount: number;
}

interface NFTFractionalizeReceiverProps {
  maxAmount: number;
  onAddReceivers: (receivers: ReceiverAddress[]) => void;
  disabled: boolean;
}

export const NFTFractionalizeReceiver: React.FC<NFTFractionalizeReceiverProps> = ({
  maxAmount,
  onAddReceivers,
  disabled
}) => {
  const [receivers, setReceivers] = useState<ReceiverAddress[]>([
    { address: '', amount: 1 }
  ]);
  const [amountLeft, setAmountLeft] = useState<number>(maxAmount);
  
  // Add a new receiver input row
  const addReceiver = () => {
    if (amountLeft <= 0) {
      toast.warning('All fractions have been allocated');
      return;
    }
    
    setReceivers([...receivers, { address: '', amount: 1 }]);
    setAmountLeft(prev => prev - 1);
  };
  
  // Remove a receiver row
  const removeReceiver = (index: number) => {
    const newReceivers = [...receivers];
    const removedAmount = newReceivers[index].amount;
    newReceivers.splice(index, 1);
    
    setReceivers(newReceivers);
    setAmountLeft(prev => prev + removedAmount);
  };
  
  // Handle address input change
  const handleAddressChange = (index: number, address: string) => {
    const newReceivers = [...receivers];
    newReceivers[index].address = address;
    setReceivers(newReceivers);
  };
  
  // Handle amount change
  const handleAmountChange = (index: number, amount: number) => {
    const currentAmount = receivers[index].amount;
    
    // Calculate how this change affects the amount left
    const newAmountLeft = amountLeft + currentAmount - amount;
    
    // Don't allow negative values or exceeding max
    if (newAmountLeft < 0 || amount <= 0) {
      toast.warning(`Cannot allocate more than ${maxAmount} fractions`);
      return;
    }
    
    const newReceivers = [...receivers];
    newReceivers[index].amount = amount;
    setReceivers(newReceivers);
    setAmountLeft(newAmountLeft);
  };
  
  // Increment amount
  const incrementAmount = (index: number) => {
    if (amountLeft <= 0) {
      toast.warning('All fractions have been allocated');
      return;
    }
    
    const newReceivers = [...receivers];
    newReceivers[index].amount += 1;
    setReceivers(newReceivers);
    setAmountLeft(prev => prev - 1);
  };
  
  // Decrement amount
  const decrementAmount = (index: number) => {
    if (receivers[index].amount <= 1) {
      return;
    }
    
    const newReceivers = [...receivers];
    newReceivers[index].amount -= 1;
    setReceivers(newReceivers);
    setAmountLeft(prev => prev + 1);
  };
  
  // Submit receivers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate addresses
    const invalidIndex = receivers.findIndex(r => !r.address || !r.address.startsWith('0x'));
    if (invalidIndex >= 0) {
      toast.error(`Please enter a valid Ethereum address for receiver ${invalidIndex + 1}`);
      return;
    }
    
    onAddReceivers(receivers);
  };
  
  return (
    <GlassCard className="p-6">
      <h3 className="text-xl font-semibold mb-4">Add Receivers</h3>
      <div className="mb-2 text-sm text-blue-300 bg-blue-900/20 p-3 rounded-lg">
        Each receiver will get an ERC-1155 token showing partial ownership of this NFT
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-3 mb-6">
          {receivers.map((receiver, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={receiver.address}
                  onChange={(e) => handleAddressChange(index, e.target.value)}
                  placeholder="0x... Ethereum Address"
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20"
                  disabled={disabled}
                />
              </div>
              
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => decrementAmount(index)}
                  className="p-2 rounded-l-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
                  disabled={disabled || receiver.amount <= 1}
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                
                <input
                  type="number"
                  value={receiver.amount}
                  onChange={(e) => handleAmountChange(index, parseInt(e.target.value) || 0)}
                  min="1"
                  className="w-16 text-center px-2 py-2 bg-white/10 border-y border-white/20"
                  disabled={disabled}
                />
                
                <button
                  type="button"
                  onClick={() => incrementAmount(index)}
                  className="p-2 rounded-r-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
                  disabled={disabled || amountLeft <= 0}
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
              
              {receivers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeReceiver(index)}
                  className="p-2 text-red-400 hover:text-red-300"
                  disabled={disabled}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}
        </div>
        
        <div className="flex justify-between mb-4">
          <button
            type="button"
            onClick={addReceiver}
            className="text-blue-400 hover:text-blue-300 text-sm flex items-center disabled:opacity-50"
            disabled={disabled || amountLeft <= 0}
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Another Receiver
          </button>
          
          <div className="text-sm text-gray-300">
            <span className="font-medium">{amountLeft}</span> of <span className="font-medium">{maxAmount}</span> fractions remaining
          </div>
        </div>
        
        <button
          type="submit"
          disabled={disabled || receivers.some(r => !r.address)}
          className={`w-full py-3 rounded-lg font-medium transition-colors
            ${disabled || receivers.some(r => !r.address)
              ? 'bg-purple-600/50 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700'}`}
        >
          Add Receivers
        </button>
      </form>
    </GlassCard>
  );
}; 