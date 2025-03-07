import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { toast } from './ui/use-toast';

const NotificationPermission = () => {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }

    // Get current permission state
    setPermission(Notification.permission);
  }, []);

  const requestPermission = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        await subscribeToPushNotifications();
        toast({
          title: 'Notifications enabled',
          description: 'You will now receive notifications from Nuri',
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToPushNotifications = async () => {
    try {
      // Check if service worker is registered
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key from server
      const response = await fetch('/api/notifications/vapid-public-key');
      const { publicKey } = await response.json();
      
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      
      // Send subscription to server
      await fetch('/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription }),
      });
      
      console.log('Push notification subscription successful');
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  };

  // Helper function to convert base64 to Uint8Array
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  };

  // Don't render anything if notifications aren't supported
  if (!('Notification' in window)) {
    return null;
  }

  // Don't render if permission is already granted
  if (permission === 'granted') {
    return null;
  }

  return (
    <div className="p-4 bg-primary/10 rounded-lg mb-4">
      <h3 className="font-medium mb-2">Enable Notifications</h3>
      <p className="text-sm mb-3">
        Get timely updates and reminders from Nuri to help with your parenting journey.
      </p>
      <Button 
        onClick={requestPermission} 
        disabled={loading || permission === 'denied'}
        variant="outline"
        size="sm"
      >
        {loading ? 'Enabling...' : 'Enable Notifications'}
      </Button>
      {permission === 'denied' && (
        <p className="text-xs mt-2 text-red-500">
          Notifications are blocked. Please update your browser settings to enable notifications.
        </p>
      )}
    </div>
  );
};

export default NotificationPermission; 