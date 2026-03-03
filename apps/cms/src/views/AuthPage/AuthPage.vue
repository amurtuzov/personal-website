<template>
  <Tabs value="login" class="h-full w-full md:w-5 m-auto">
    <TabList :pt="{ tabList: { class: 'justify-content-center' } }">
      <Tab value="login" class="w-6">
        Login
      </Tab>
      <Tab value="register" class="w-6">
        Register
      </Tab>
    </TabList>
    <TabPanels class="flex-1">
      <TabPanel value="login">
        <Form v-slot="$form" :resolver="loginFormResolver" :initialValues="loginFields" class="flex flex-column align-items-center gap-4 w-full pt-8" @submit="onLoginFormSubmit">
          <div class="flex flex-column gap-1 w-full md:w-6">
            <InputText v-model="loginFields.email" name="email" type="text" placeholder="Email" />
            <template v-if="$form.email?.invalid">
              <Message v-for="(error, index) of $form.email.errors" :key="index" severity="error" size="small" variant="simple">
                {{ error.message }}
              </Message>
            </template>
          </div>
          <div class="flex flex-column gap-1 w-full md:w-6">
            <Password v-model="loginFields.password" name="password" placeholder="Password" :feedback="false" fluid />
            <template v-if="$form.password?.invalid">
              <Message v-for="(error, index) of $form.password.errors" :key="index" severity="error" size="small" variant="simple">
                {{ error.message }}
              </Message>
            </template>
          </div>
          <div class="flex flex-column gap-1 w-full md:w-6">
            <template v-if="loginError">
              <template v-if="Array.isArray(loginError.data.message)">
                <Message v-for="(errorMessage, index) of loginError.data.message" :key="index" severity="error" size="small" variant="simple">
                  {{ errorMessage }}
                </Message>
              </template>
              <template v-else>
                <Message severity="error" size="small" variant="simple">
                  {{ loginError.data.message }}
                </Message>
              </template>
            </template>
          </div>
          <Button type="submit" severity="primary" label="Submit" :disabled="isLoadingLogin" class="w-full md:w-6" />
        </Form>
      </TabPanel>
      <TabPanel value="register">
        <Form v-slot="$form" :resolver="registerFormResolver" :initialValues="registerFields" class="flex flex-column align-items-center gap-4 w-full pt-8" @submit="onRegisterFormSubmit">
          <div class="flex flex-column gap-1 w-full md:w-6">
            <InputText v-model="registerFields.email" name="email" type="text" placeholder="Email" />
            <template v-if="$form.email?.invalid">
              <Message v-for="(error, index) of $form.email.errors" :key="index" severity="error" size="small" variant="simple">
                {{ error.message }}
              </Message>
            </template>
          </div>
          <div class="flex flex-column gap-1 w-full md:w-6">
            <InputText v-model="registerFields.name" name="name" type="text" placeholder="Name" />
            <template v-if="$form.name?.invalid">
              <Message v-for="(error, index) of $form.name.errors" :key="index" severity="error" size="small" variant="simple">
                {{ error.message }}
              </Message>
            </template>
          </div>
          <div class="flex flex-column gap-1 w-full md:w-6">
            <Password v-model="registerFields.password" name="password" placeholder="Password" :feedback="false" fluid />
            <template v-if="$form.password?.invalid">
              <Message v-for="(error, index) of $form.password.errors" :key="index" severity="error" size="small" variant="simple">
                {{ error.message }}
              </Message>
            </template>
          </div>
          <div class="flex flex-column gap-1 w-full md:w-6">
            <template v-if="registerError">
              <template v-if="Array.isArray(registerError.data.message)">
                <Message v-for="(errorMessage, index) of registerError.data.message" :key="index" severity="error" size="small" variant="simple">
                  {{ errorMessage }}
                </Message>
              </template>
              <template v-else>
                <Message severity="error" size="small" variant="simple">
                  {{ registerError.data.message }}
                </Message>
              </template>
            </template>
          </div>
          <Button type="submit" severity="primary" label="Submit" class="w-full md:w-6" />
        </Form>
      </TabPanel>
    </TabPanels>
  </Tabs>
</template>

<script lang="ts" src="./AuthPage.ts"></script>
