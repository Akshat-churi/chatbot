const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");
const voiceRecordBtn = document.querySelector("#voice-record-btn");
const voiceSettingsBtn = document.querySelector("#voice-settings-btn");
const voiceStatusText = document.querySelector("#voice-status-text");
const voiceIndicator = document.querySelector("#voice-indicator");

// API Setup
const API_KEY = "AIzaSyAVQrX1y_65-FLZj7FYMAb74TGFk55smC4";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

// Voice and Speech Setup
let recognition = null;
let synthesis = window.speechSynthesis;
let voices = [];
let controller, typingInterval;
let isRecording = false;
let isSpeaking = false;

// Chat and voice settings
const chatHistory = [];
const userData = { message: "", file: {} };
const voiceSettings = {
  rate: 1,
  pitch: 1,
  volume: 1,
  autoSpeak: true,
  voice: null
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  initializeVoice();
  loadVoices();
  setupEventListeners();
  setInitialTheme();
});

// Initialize voice recognition
function initializeVoice() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      isRecording = true;
      voiceRecordBtn.classList.add('recording');
      voiceRecordBtn.textContent = 'stop';
      voiceStatusText.textContent = 'Listening...';
      voiceIndicator.classList.add('recording');
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      promptInput.value = transcript;
      voiceStatusText.textContent = 'Voice ready';
      voiceIndicator.classList.remove('recording');
    };
    
    recognition.onend = () => {
      isRecording = false;
      voiceRecordBtn.classList.remove('recording');
      voiceRecordBtn.textContent = 'mic';
      voiceStatusText.textContent = 'Voice ready';
      voiceIndicator.classList.remove('recording');
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      isRecording = false;
      voiceRecordBtn.classList.remove('recording');
      voiceRecordBtn.textContent = 'mic';
      voiceStatusText.textContent = 'Voice error - try again';
      voiceIndicator.classList.remove('recording');
    };
  } else {
    voiceRecordBtn.style.display = 'none';
    voiceStatusText.textContent = 'Voice not supported';
  }
}

// Load available voices
function loadVoices() {
  voices = synthesis.getVoices();
  
  const voiceSelect = document.querySelector("#voice-select");
  voices.forEach((voice, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${voice.name} (${voice.lang})`;
    voiceSelect.appendChild(option);
  });
  
  // Load saved voice settings
  const savedSettings = localStorage.getItem('voiceSettings');
  if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    Object.assign(voiceSettings, settings);
    
    
    voiceSelect.value = settings.voice || '';
    document.querySelector("#voice-rate").value = settings.rate || 1;
    document.querySelector("#voice-pitch").value = settings.pitch || 1;
    document.querySelector("#voice-volume").value = settings.volume || 1;
    document.querySelector("#auto-speak").checked = settings.autoSpeak !== false;
    
    updateVoiceValueDisplays();
  }
}

// Update voice value displays
function updateVoiceValueDisplays() {
  document.querySelector("#rate-value").textContent = voiceSettings.rate.toFixed(1);
  document.querySelector("#pitch-value").textContent = voiceSettings.pitch.toFixed(1);
  document.querySelector("#volume-value").textContent = voiceSettings.volume.toFixed(1);
}

// Setup all event listeners
function setupEventListeners() {
  // Voice recording
  voiceRecordBtn.addEventListener("click", toggleVoiceRecording);
  
  // Voice settings
  voiceSettingsBtn.addEventListener("click", openVoiceSettings);
  document.querySelector("#close-voice-settings").addEventListener("click", closeVoiceSettings);
  
  // Voice setting controls
  document.querySelector("#voice-select").addEventListener("change", (e) => {
    voiceSettings.voice = e.target.value;
    saveVoiceSettings();
  });
  
  document.querySelector("#voice-rate").addEventListener("input", (e) => {
    voiceSettings.rate = parseFloat(e.target.value);
    updateVoiceValueDisplays();
    saveVoiceSettings();
  });
  
  document.querySelector("#voice-pitch").addEventListener("input", (e) => {
    voiceSettings.pitch = parseFloat(e.target.value);
    updateVoiceValueDisplays();
    saveVoiceSettings();
  });
  
  document.querySelector("#voice-volume").addEventListener("input", (e) => {
    voiceSettings.volume = parseFloat(e.target.value);
    updateVoiceValueDisplays();
    saveVoiceSettings();
  });
  
  document.querySelector("#auto-speak").addEventListener("change", (e) => {
    voiceSettings.autoSpeak = e.target.checked;
    saveVoiceSettings();
  });
  
  // Form submission
  promptForm.addEventListener("submit", handleFormSubmit);
  
  // File handling
  fileInput.addEventListener("change", handleFileInput);
  document.querySelector("#cancel-file-btn").addEventListener("click", cancelFileUpload);
  document.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());
  
  // Other controls
  document.querySelector("#stop-response-btn").addEventListener("click", stopBotResponse);
  themeToggleBtn.addEventListener("click", toggleTheme);
  document.querySelector("#delete-chats-btn").addEventListener("click", deleteAllChats);
  
  // Suggestions
  document.querySelectorAll(".suggestions-item").forEach((suggestion) => {
    suggestion.addEventListener("click", () => {
      promptInput.value = suggestion.querySelector(".text").textContent;
      promptForm.dispatchEvent(new Event("submit"));
    });
  });
  
  // Mobile controls
  document.addEventListener("click", handleMobileControls);
}

// Toggle voice recording
function toggleVoiceRecording() {
  if (!recognition) return;
  
  if (isRecording) {
    recognition.stop();
  } else {
    recognition.start();
  }
}

// Open voice settings modal
function openVoiceSettings() {
  document.querySelector("#voice-settings-modal").style.display = "block";
}

// Close voice settings modal
function closeVoiceSettings() {
  document.querySelector("#voice-settings-modal").style.display = "none";
}

// Save voice settings to localStorage
function saveVoiceSettings() {
  localStorage.setItem('voiceSettings', JSON.stringify(voiceSettings));
}

// Set initial theme
function setInitialTheme() {
  const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
  document.body.classList.toggle("light-theme", isLightTheme);
  themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";
}

// Toggle theme
function toggleTheme() {
  const isLightTheme = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
  themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";
}

// Text-to-speech function
function speakText(text) {
  if (!voiceSettings.autoSpeak || isSpeaking) return;
  
  // Stop any current speech
  synthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Apply voice settings
  utterance.rate = voiceSettings.rate;
  utterance.pitch = voiceSettings.pitch;
  utterance.volume = voiceSettings.volume;
  
  // Set voice if selected
  if (voiceSettings.voice && voices[voiceSettings.voice]) {
    utterance.voice = voices[voiceSettings.voice];
  }
  
  utterance.onstart = () => {
    isSpeaking = true;
    voiceIndicator.classList.add('speaking');
    voiceStatusText.textContent = 'Speaking...';
  };
  
  utterance.onend = () => {
    isSpeaking = false;
    voiceIndicator.classList.remove('speaking');
    voiceStatusText.textContent = 'Voice ready';
  };
  
  utterance.onerror = (event) => {
    console.error('Speech synthesis error:', event.error);
    isSpeaking = false;
    voiceIndicator.classList.remove('speaking');
    voiceStatusText.textContent = 'Voice error';
  };
  
  synthesis.speak(utterance);
}

// Stop current speech
function stopSpeech() {
  synthesis.cancel();
  isSpeaking = false;
  voiceIndicator.classList.remove('speaking');
  voiceStatusText.textContent = 'Voice ready';
}

// Create message elements
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// Scroll to the bottom of the container
const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

// Simulate typing effect for bot responses
const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  const words = text.split(" ");
  let wordIndex = 0;
  
  // Set an interval to type each word
  typingInterval = setInterval(() => {
    if (wordIndex < words.length) {
      textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
      
      // Auto-speak the response
      if (voiceSettings.autoSpeak) {
        speakText(text);
      }
    }
  }, 40); // 40 ms delay
};

// Make the API call and generate the bot's response
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();
  
  // Add user message and file data to the chat history
  chatHistory.push({
    role: "user",
    parts: [{ text: userData.message }, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])],
  });
  
  try {
    // Send the chat history to the API to get a response
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: chatHistory }),
      signal: controller.signal,
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);
    
    // Process the response text and display with typing effect
    const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
    typingEffect(responseText, textElement, botMsgDiv);
    chatHistory.push({ role: "model", parts: [{ text: responseText }] });
  } catch (error) {
    textElement.textContent = error.name === "AbortError" ? "Response generation stopped." : error.message;
    textElement.style.color = "#d62939";
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
    scrollToBottom();
  } finally {
    userData.file = {};
  }
};

// Handle the form submission
const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding")) return;
  
  userData.message = userMessage;
  promptInput.value = "";
  document.body.classList.add("chats-active", "bot-responding");
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
  
  // Generate user message HTML with optional file attachment
  const userMsgHTML = `
    <p class="message-text"></p>
    ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />` : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) : ""}
  `;
  
  const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userData.message;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();
  
  setTimeout(() => {
    // Generate bot message HTML and add in the chat container
    const botMsgHTML = `<img class="avatar" src="gemini.svg" /> <p class="message-text">Just a sec...</p>`;
    const botMsgDiv = createMessageElement(botMsgHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 600); // 600 ms delay
};

// Handle file input change
const handleFileInput = () => {
  const file = fileInput.files[0];
  if (!file) return;
  
  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();
  reader.readAsDataURL(file);
  
  reader.onload = (e) => {
    fileInput.value = "";
    const base64String = e.target.result.split(",")[1];
    fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
    fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");
    
    // Store file data in userData obj
    userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };
  };
};

// Cancel file upload
const cancelFileUpload = () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
};

// Stop bot response
const stopBotResponse = () => {
  controller?.abort();
  userData.file = {};
  clearInterval(typingInterval);
  stopSpeech();
  
  const loadingMessage = chatsContainer.querySelector(".bot-message.loading");
  if (loadingMessage) {
    loadingMessage.classList.remove("loading");
    loadingMessage.querySelector(".message-text").textContent = "Response stopped.";
  }
  
  document.body.classList.remove("bot-responding");
};

// Delete all chats
const deleteAllChats = () => {
  chatHistory.length = 0;
  chatsContainer.innerHTML = "";
  document.body.classList.remove("chats-active", "bot-responding");
  stopSpeech();
};

// Handle mobile controls
const handleMobileControls = ({ target }) => {
  const wrapper = document.querySelector(".prompt-wrapper");
  const shouldHide = target.classList.contains("prompt-input") || 
    (wrapper.classList.contains("hide-controls") && 
     (target.id === "add-file-btn" || target.id === "stop-response-btn" || target.id === "voice-record-btn"));
  wrapper.classList.toggle("hide-controls", shouldHide);
};

// Close modal when clicking outside
window.addEventListener("click", (event) => {
  const modal = document.querySelector("#voice-settings-modal");
  if (event.target === modal) {
    closeVoiceSettings();
  }
});

// Load voices when they become available
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = loadVoices;
}
