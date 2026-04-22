<template>
  <div class="container mt-4">
    <div class="alert alert-success">
      <h4>Vue MFE Loaded Successfully!</h4>
      <p class="mb-0">
        This is a <strong>Vue 3</strong> Micro Frontend running on port
        <code>3002</code>, loaded inside the Shell via
        <strong>Webpack 5 Module Federation</strong>.
      </p>
    </div>
    <div class="card">
      <div class="card-body">
        <h5 class="card-title">Vue MFE Details</h5>
        <ul>
          <li>Framework: Vue 3 (Composition API)</li>
          <li>Bundler: Webpack 5</li>
          <li>Integration: Web Component wrapper</li>
          <li>CSS: Bootstrap 5 (shared)</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "VueApp",
};
</script>
