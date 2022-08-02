const $alert = document.querySelector(".alert");

if ($alert) {
  const bsAlert = bootstrap.Alert.getOrCreateInstance(".alert");

  const closeAlert = setTimeout(() => {
    bsAlert.close();
    $alert.parentElement.removeChild($alert);
    clearTimeout(closeAlert);
  }, 5000);
}
