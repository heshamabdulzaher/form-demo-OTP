function renderNextStep(e) {
  e.preventDefault();
  const currentForm = document.querySelector('.step.active');
  const OTPForm = document.querySelector('.step.otp-step');
  currentForm.classList.remove('active');
  OTPForm.classList.add('active');
}
