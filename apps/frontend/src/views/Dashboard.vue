<template>
  <div class="min-h-screen bg-gray-50">
    <nav class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-semibold">Peerit Dashboard</h1>
          </div>
          <div class="flex items-center">
            <button
              @click="logout"
              class="text-gray-500 hover:text-gray-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>

    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">
          Welcome to your dashboard
        </h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <h3 class="text-lg font-medium text-gray-900">Active Reviews</h3>
              <p class="mt-1 text-sm text-gray-500">Reviews pending completion</p>
              <p class="mt-2 text-3xl font-bold text-indigo-600">3</p>
            </div>
          </div>
          
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <h3 class="text-lg font-medium text-gray-900">Completed Reviews</h3>
              <p class="mt-1 text-sm text-gray-500">Reviews you've submitted</p>
              <p class="mt-2 text-3xl font-bold text-green-600">12</p>
            </div>
          </div>
          
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <h3 class="text-lg font-medium text-gray-900">Team Members</h3>
              <p class="mt-1 text-sm text-gray-500">People in your team</p>
              <p class="mt-2 text-3xl font-bold text-blue-600">5</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Dashboard',
  methods: {
    logout() {
      console.log('Logout clicked')
      // TODO: Implement actual logout logic
      this.$router.push('/')
    }
  }
}
</script>
