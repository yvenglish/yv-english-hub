import { getToken, onMessage } from "firebase/messaging";
import { messaging, db } from "../config/firebase";
import { doc, updateDoc } from "firebase/firestore";

const VAPID_KEY = "BBT-Yr1LFrGGx5iIje5wBdOgCCPa_PWyLO6jPs-WPj1XtczfRPi3x3e9-8NbauAHj5lIpgYK0dcsYjY6e4kPkUM";

export const requestNotificationPermission = async (userId) => {
  if (!messaging) {
    console.warn("Firebase Messaging is not supported in this browser.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (currentToken) {
        // Save the token to the user's document
        await updateDoc(doc(db, "users", userId), {
          fcmToken: currentToken
        });
        console.log("Push notification token saved.");
        return true;
      } else {
        console.log("No registration token available. Request permission to generate one.");
        return false;
      }
    } else {
      console.log("Unable to get permission to notify.");
      return false;
    }
  } catch (err) {
    console.error("An error occurred while retrieving token. ", err);
    return false;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
