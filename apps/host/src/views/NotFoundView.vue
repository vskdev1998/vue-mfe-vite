<template>
  <section class="page not-found">
    <h1>404</h1>
    <p>That page doesn't exist in the host.</p>
    <RouterLink class="btn btn--primary" to="/">Back to dashboard</RouterLink>
  </section>
</template>

<style lang="scss" scoped>
.not-found {
  text-align: center;

  h1 {
    font-size: 72px;
    margin: 32px 0 0;
    color: $brand;
  }
}
</style>
