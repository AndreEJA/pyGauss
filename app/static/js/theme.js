(function() {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const sunIcon = document.getElementById('theme-toggle-sun');
  const moonIcon = document.getElementById('theme-toggle-moon');
  const htmlEl = document.documentElement;

  function updateIcon(isDarkMode) {
    if (sunIcon && moonIcon) {
      sunIcon.classList.toggle('hidden', isDarkMode);
      moonIcon.classList.toggle('hidden', !isDarkMode);
    }
  }

  // Actualizar ícono al cargar la página 
  updateIcon(htmlEl.classList.contains('dark'));

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      // Alternar la clase 'dark' en el elemento html
      const isDarkMode = htmlEl.classList.toggle('dark');
      
      //preferencia en localStorage
      localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
      
      updateIcon(isDarkMode);
    });
  }
})();