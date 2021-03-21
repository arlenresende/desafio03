import { totalmem } from 'node:os';
import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
        const productInCart = cart.find(product => product.id === productId);

        if(!productInCart){
          const { data: product} = await api.get<Product>(`products/${productId}`);
          const { data: stock} = await api.get<Stock>(`stock/${productId}`);

          if(stock.amount > 0){
            setCart([...cart, {...product, amount :1 }]);
            localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, {...product,amount :1}]));
            toast('Adicionado')
            return
          }

        }

        if(productInCart){
          const { data: stock} = await api.get<Stock>(`stock/${productId}`);
            if(stock.amount >productInCart.amount ){
              const updateValueCart = cart.map(cartItem => cartItem.id === productId ? {
                ...cartItem,
                amount: Number(cartItem.amount + 1)
              } : cartItem)

              setCart (updateValueCart);
              localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateValueCart));
              return
            }
            else{
              toast.error('Quantidade solicitada fora de estoque')
            }

        } 
     
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const hasProduct = cart.some (cartProduct => cartProduct.id === productId);


      if(!hasProduct){
        toast.error('Erro na remoção do produto');
        return;
      }
      const updateCart = cart.filter(cartItem => cartItem.id !== productId);
      setCart(updateCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));

    } catch {
      toast.error('Erro na remoção do Produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1){
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      const response = await api.get(`/stock/${productId}`);
      const productAmount = response.data.amount;
      const hasNoStock = amount > productAmount;

      if (hasNoStock){
        toast.error('Quantidade solicitada fora de estoque')
        return;

      }

      const hasProduct = cart.some(cartProduct => cartProduct.id === productId);
      if(!hasProduct){
        toast.error('Erro na alteração de quantidade do produto');
      }

      const updateCart = cart.map(cartItem => cartItem.id === productId ? {
        ...cartItem,
        amount : amount
      } : cartItem);

      setCart(updateCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
